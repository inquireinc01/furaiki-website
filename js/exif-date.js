// JPEG画像の先頭部分だけを読み込み、EXIFの撮影日時(DateTimeOriginal、
// 無ければDateTime)を取り出す。HEICから変換した写真やHEICでない画像等、
// EXIFが読めない場合は null を返す(エラーにはしない)。
window.readExifDate = function (url) {
  return fetch(url, { headers: { Range: "bytes=0-131071" } })
    .then((res) => res.arrayBuffer())
    .then((buf) => parseExifDate(new DataView(buf)))
    .catch(() => null);
};

function parseExifDate(view) {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // JPEGでない

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break; // マーカーでなくなったら終了
    if (marker === 0xffd8 || marker === 0xff01 || (marker >= 0xffd0 && marker <= 0xffd7)) {
      offset += 2;
      continue;
    }
    if (offset + 4 > view.byteLength) break;
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1) {
      try {
        const date = parseApp1(view, offset + 4, size - 2);
        if (date) return date;
      } catch (e) {
        return null;
      }
    }
    if (marker === 0xffda) break; // 画像データ本体に到達(これ以降にEXIFは無い)
    offset += 2 + size;
  }
  return null;
}

function parseApp1(view, start) {
  // "Exif\0\0" の確認
  if (view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0x0000) {
    return null;
  }
  const tiffStart = start + 6;
  const little = view.getUint16(tiffStart) === 0x4949; // "II" = リトルエンディアン
  const get16 = (o) => view.getUint16(o, little);
  const get32 = (o) => view.getUint32(o, little);

  const ifd0Offset = tiffStart + get32(tiffStart + 4);
  const exifIfdOffset = findPointerTag(view, tiffStart, ifd0Offset, 0x8769, little);

  if (exifIfdOffset) {
    const d = readDateTag(view, tiffStart, exifIfdOffset, 0x9003, little); // DateTimeOriginal
    if (d) return d;
  }
  return readDateTag(view, tiffStart, ifd0Offset, 0x0132, little); // DateTime(更新日時)
}

function ifdEntryCount(view, ifdOffset, little) {
  return view.getUint16(ifdOffset, little);
}

function findPointerTag(view, tiffStart, ifdOffset, tag, little) {
  const count = ifdEntryCount(view, ifdOffset, little);
  for (let i = 0; i < count; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (view.getUint16(entryOffset, little) === tag) {
      return tiffStart + view.getUint32(entryOffset + 8, little);
    }
  }
  return null;
}

function readDateTag(view, tiffStart, ifdOffset, tag, little) {
  const count = ifdEntryCount(view, ifdOffset, little);
  for (let i = 0; i < count; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (view.getUint16(entryOffset, little) !== tag) continue;
    const valueOffset = tiffStart + view.getUint32(entryOffset + 8, little);
    if (valueOffset + 19 > view.byteLength) return null;
    let str = "";
    for (let j = 0; j < 19; j++) str += String.fromCharCode(view.getUint8(valueOffset + j));
    const m = str.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  }
  return null;
}
