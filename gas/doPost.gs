// れいわキャリア 登録フォーム - doPost
// 2段階送信対応: firstSubmit（電話番号のみ）/ finalSubmit（全データ上書き）

var GAS_URL = 'https://script.google.com/macros/s/AKfycbwvb-2dIF4ZT9QVk41nRaMgwIIbSEdwUnkErtyvbSDLgtHUTGvhoqxPlU0ZyHr1Xf0xRw/exec';

// スプシ列定義（A=1始まり）※既存スプシの列順に合わせる
var COL = {
  TIMESTAMP:          1,  // A
  WORK_START:         2,  // B
  JOB_TYPE:           3,  // C
  CONDITION:          4,  // D
  EDUCATION:          5,  // E
  EMPLOYMENT_STATUS:  6,  // F
  FULL_NAME:          7,  // G
  BIRTH_DATE:         8,  // H
  GENDER:             9,  // I
  PHONE:              10, // J ★キー列
  EMAIL:              11, // K
  PREFECTURE:         12, // L
  INTERVIEW_1:        13, // M
  INTERVIEW_2:        14, // N
  INTERVIEW_3:        15  // O
};

function doPost(e) {
  try {
    var raw = e.parameter.data || e.postData.contents;
    var data = JSON.parse(raw);
    var action = data.action;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    if (action === 'firstSubmit') {
      handleFirstSubmit(sheet, data);
    } else if (action === 'finalSubmit') {
      handleFinalSubmit(sheet, data);
    } else {
      // 旧フォームからのリクエスト（actionなし）は finalSubmit として処理
      handleFinalSubmit(sheet, data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 第1送信: その時点までの全データを新規追加
function handleFirstSubmit(sheet, data) {
  var phone = data.phone || '';
  if (!phone) return;

  var row = buildFullRow(data);
  row[COL.TIMESTAMP - 1] = new Date();
  sheet.appendRow(row);
}

// 第2送信: 電話番号をキーに行を検索し全データ上書き（見つからなければ新規追加）
function handleFinalSubmit(sheet, data) {
  var phone = data.phone || '';
  var rowIndex = phone ? findRowByPhone(sheet, phone) : -1;

  var row = buildFullRow(data);

  if (rowIndex > 0) {
    // 既存行を上書き（タイムスタンプはそのまま保持）
    var existingTimestamp = sheet.getRange(rowIndex, COL.TIMESTAMP).getValue();
    row[COL.TIMESTAMP - 1] = existingTimestamp || new Date();
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    // 行が見つからない場合は新規追加
    row[COL.TIMESTAMP - 1] = new Date();
    sheet.appendRow(row);
  }
}

// 電話番号でB列を検索して行番号を返す（見つからない場合は -1）
function findRowByPhone(sheet, phone) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  var phoneCol = sheet.getRange(2, COL.PHONE, lastRow - 1, 1).getValues();
  var normalizedPhone = normalizePhone(phone);

  for (var i = 0; i < phoneCol.length; i++) {
    if (normalizePhone(String(phoneCol[i][0])) === normalizedPhone) {
      return i + 2; // 1-indexed + ヘッダー行分
    }
  }
  return -1;
}

// 電話番号のハイフンを除去して正規化
function normalizePhone(phone) {
  return phone.replace(/-/g, '').trim();
}

// 全データの行配列を構築
function buildFullRow(data) {
  var row = new Array(Object.keys(COL).length).fill('');
  row[COL.TIMESTAMP - 1]         = ''; // handleFinalSubmit側で設定
  row[COL.PHONE - 1]             = data.phone              || '';
  row[COL.WORK_START - 1]        = data.workStart          || '';
  row[COL.JOB_TYPE - 1]          = Array.isArray(data.jobType) ? data.jobType.join('、') : (data.jobType || '');
  row[COL.CONDITION - 1]         = Array.isArray(data.condition) ? data.condition.join('、') : (data.condition || '');
  row[COL.EDUCATION - 1]         = data.education          || '';
  row[COL.EMPLOYMENT_STATUS - 1] = data.employmentStatus   || '';
  row[COL.PREFECTURE - 1]        = data.prefecture         || '';
  row[COL.GENDER - 1]            = data.gender             || '';
  row[COL.FULL_NAME - 1]         = data.fullName           || '';
  row[COL.BIRTH_DATE - 1]        = data.birthDate          || '';
  row[COL.EMAIL - 1]             = data.email              || '';
  row[COL.INTERVIEW_1 - 1]       = data.interviewDateTime1 || '';
  row[COL.INTERVIEW_2 - 1]       = data.interviewDateTime2 || '';
  row[COL.INTERVIEW_3 - 1]       = data.interviewDateTime3 || '';
  return row;
}

// スプシのヘッダー行を初期化するユーティリティ（初回のみ手動実行）
function initializeHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = [
    'タイムスタンプ',
    '勤務開始時期',
    '希望職種',
    '希望条件',
    '最終学歴',
    '就業状況',
    '氏名',
    '生年月日',
    '性別',
    '電話番号',
    'メールアドレス',
    '都道府県',
    '面談希望日時（第1）',
    '面談希望日時（第2）',
    '面談希望日時（第3）'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}
