// ============================================================
// れいわキャリア フォーム doPost 統合版
// 2段階送信対応: firstSubmit（電話番号取得）/ finalSubmit（全データ完了）
// Slack通知: firstSubmitのみ発火
// 自動返信メール: finalSubmitのみ発火
// ============================================================

var SPREADSHEET_ID = '1Vq0uK-w9M4EKft3l1TyzNz06yPrhtTTovH0Nb7inM1w';
var SHEET_NAME     = '顧客データDB';
var SLACK_URL      = 'YOUR_SLACK_WEBHOOK_URL'; // GASエディタ上で実際のURLに書き換えてください

var MAIL_CONFIG = {
  SENDER_NAME:   '【送信専用】れいわキャリアお問い合わせ窓口',
  ADMIN_EMAIL:   'box-reiwa_reservation@box-hr.co.jp',
  REPLY_TO:      'box-reiwa_reservation@box-hr.co.jp',
  NEXT_STEP_URL: 'https://liff.line.me/2008784499-92DR4hmy/landing?follow=%40872lluqj&lp=mZQNCq&liff_id=2008784499-92DR4hmy',
};

// スプシ列定義（既存順を厳守）
var COL = {
  TIMESTAMP:         1,  // A
  WORK_START:        2,  // B
  JOB_TYPE:          3,  // C
  CONDITION:         4,  // D
  EDUCATION:         5,  // E
  EMPLOYMENT_STATUS: 6,  // F
  FULL_NAME:         7,  // G
  BIRTH_DATE:        8,  // H
  GENDER:            9,  // I
  PHONE:             10, // J ★キー列
  EMAIL:             11, // K
  PREFECTURE:        12, // L
  INTERVIEW_1:       13, // M
  INTERVIEW_2:       14, // N
  INTERVIEW_3:       15  // O
};

// ============================================================
// メイン
// ============================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    var jsonString = e.parameter.data || e.postData.getDataAsString();
    var data = JSON.parse(jsonString);
    var action = data.action || 'legacy';

    if (action === 'firstSubmit') {
      // 電話番号取得タイミング: 新規行追加 + Slack通知のみ
      writeNewRow(sheet, data);
      try { notifySlack(data); } catch(slackErr) { Logger.log('Slackエラー: ' + slackErr); }

    } else if (action === 'finalSubmit') {
      // 完了タイミング: 既存行を全データ上書き + 自動返信メール
      var rowIndex = findRowByPhone(sheet, data.phone || '');
      if (rowIndex > 0) {
        updateRow(sheet, rowIndex, data);
      } else {
        writeNewRow(sheet, data);
      }
      try { sendAutoReplyEmail(data); } catch(mailErr) { Logger.log('メールエラー: ' + mailErr); }

    } else {
      // 旧フォーム互換（actionなし）: 新規行追加 + メールのみ（SlackはfirstSubmitのみ）
      writeNewRow(sheet, data);
      try { sendAutoReplyEmail(data); } catch(mailErr) { Logger.log('メールエラー: ' + mailErr); }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }));

  } catch(error) {
    Logger.log('メインエラー: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }));
  }
}

// ============================================================
// スプシ操作
// ============================================================

function buildRow(data, timestamp) {
  return [
    timestamp || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    data.workStart        || '',
    Array.isArray(data.jobType)   ? data.jobType.join(', ')   : (data.jobType   || ''),
    Array.isArray(data.condition) ? data.condition.join(', ') : (data.condition || ''),
    data.education        || '',
    data.employmentStatus || '',
    data.fullName         || '',
    data.birthDate        || '',
    data.gender           || '',
    data.phone            || '',
    data.email            || '',
    data.prefecture       || '',
    data.interviewDateTime1 || '',
    data.interviewDateTime2 || '',
    data.interviewDateTime3 || ''
  ];
}

function writeNewRow(sheet, data) {
  var values = sheet.getRange('A:A').getValues();
  var lastRow = 0;
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] !== '') lastRow = i + 1;
  }
  var newRow = lastRow + 1;
  sheet.getRange(newRow, 1, 1, 15).setValues([buildRow(data)]);
}

function updateRow(sheet, rowIndex, data) {
  // タイムスタンプは第1送信時のものを保持
  var existingTimestamp = sheet.getRange(rowIndex, COL.TIMESTAMP).getValue();
  var ts = existingTimestamp
    ? Utilities.formatDate(new Date(existingTimestamp), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss')
    : Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  sheet.getRange(rowIndex, 1, 1, 15).setValues([buildRow(data, ts)]);
}

function findRowByPhone(sheet, phone) {
  if (!phone) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var phoneCol = sheet.getRange(2, COL.PHONE, lastRow - 1, 1).getValues();
  var normalized = phone.replace(/-/g, '').trim();
  // 最新の行から逆順で検索（重複電話番号でも最新行を確実に更新）
  for (var i = phoneCol.length - 1; i >= 0; i--) {
    if (String(phoneCol[i][0]).replace(/-/g, '').trim() === normalized) {
      return i + 2;
    }
  }
  return -1;
}

// ============================================================
// Slack通知（firstSubmitのみ呼ばれる）
// ============================================================

function notifySlack(data) {
  var message = {
    text: '<@U0ABRUC6JRE> :mega: 新しい応募\n名前: ' + (data.fullName || '未入力') +
          '\n電話: ' + (data.phone || '未入力') +
          '\n<https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit|スプレッドシート>'
  };
  UrlFetchApp.fetch(SLACK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(message),
    muteHttpExceptions: true
  });
}

// ============================================================
// 自動返信メール（finalSubmitのみ呼ばれる）
// ============================================================

function sendAutoReplyEmail(data) {
  var email = data.email || '';
  if (!email || !isValidEmail(email)) {
    Logger.log('メールアドレス無効のためスキップ: ' + email);
    return;
  }

  var name       = data.fullName          || 'お客様';
  var period     = data.workStart         || '';
  var jobType    = Array.isArray(data.jobType)    ? data.jobType.join(', ')    : (data.jobType    || '');
  var condition  = Array.isArray(data.condition)  ? data.condition.join(', ')  : (data.condition  || '');
  var education  = data.education         || '';
  var employment = data.employmentStatus  || '';
  var prefecture = data.prefecture        || '';
  var schedule1  = data.interviewDateTime1 || '';
  var schedule2  = data.interviewDateTime2 || '';
  var schedule3  = data.interviewDateTime3 || '';

  var scheduleLines = [schedule1, schedule2, schedule3]
    .filter(function(s) { return s !== ''; })
    .map(function(s, i) { return '\u3000第' + (i + 1) + '希望: ' + s; })
    .join('\n');

  var subject = '【受付完了】' + name + '様、面談お申し込みありがとうございます';
  var body =
    '※このメールは送信専用です。返信いただいてもお答えできません。\n' +
    '──────────────────────────────\n\n' +
    name + ' 様\n\n' +
    'この度は面談にお申し込みいただき、誠にありがとうございます。\n' +
    '以下の内容で受け付けいたしました。\n\n' +
    '━━━━━━ お申し込み内容 ━━━━━━\n' +
    'お名前\u3000\u3000\u3000: ' + name + '\n' +
    '都道府県\u3000\u3000: ' + prefecture + '\n' +
    '転職希望時期: ' + period + '\n' +
    '希望職種\u3000\u3000: ' + jobType + '\n' +
    '希望条件\u3000\u3000: ' + condition + '\n' +
    '雇用形態\u3000\u3000: ' + employment + '\n' +
    '学歴\u3000\u3000\u3000\u3000: ' + education + '\n\n' +
    '▼ ご希望の面談日時\n' +
    (scheduleLines || '\u3000（未入力）') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '担当者が日程を確認し、24時間以内にご連絡いたします。\n\n' +
    'こちらのメールは送信専用となります。\n' +
    'ご不明な点は公式LINEにてご連絡ください。\n' +
    '引き続きよろしくお願いいたします。\n\n' +
    '▼ 公式LINEはこちら\n\u3000' + MAIL_CONFIG.NEXT_STEP_URL + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━\n' +
    MAIL_CONFIG.SENDER_NAME + '\n' +
    '受付時間: 平日 10:00〜19:00\n' +
    '━━━━━━━━━━━━━━━━━━━━━━';

  GmailApp.sendEmail(email, subject, body, {
    name:    MAIL_CONFIG.SENDER_NAME,
    replyTo: MAIL_CONFIG.REPLY_TO,
  });

  var adminSubject = '【新規申込】' + name + '（' + prefecture + '）転職希望: ' + period;
  var adminBody =
    '新しい面談申し込みが入りました。\n\n' +
    'お名前\u3000\u3000\u3000: ' + name + '\n' +
    'メール\u3000\u3000\u3000: ' + email + '\n' +
    '電話番号\u3000\u3000: ' + (data.phone || '') + '\n' +
    '都道府県\u3000\u3000: ' + prefecture + '\n' +
    '転職希望時期: ' + period + '\n' +
    '希望職種\u3000\u3000: ' + jobType + '\n' +
    '雇用形態\u3000\u3000: ' + employment + '\n\n' +
    '第1希望: ' + (schedule1 || '未入力') + '\n' +
    '第2希望: ' + (schedule2 || '未入力') + '\n' +
    '第3希望: ' + (schedule3 || '未入力') + '\n\n' +
    '▼ スプレッドシート\n' +
    'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID;

  GmailApp.sendEmail(MAIL_CONFIG.ADMIN_EMAIL, adminSubject, adminBody);
  Logger.log('✅ メール送信完了: ' + email);
}

// ============================================================
// ユーティリティ
// ============================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// ============================================================
// テスト用
// ============================================================

function testEmail() {
  sendAutoReplyEmail({
    fullName:           '濱﨑ちひろ',
    email:              '139.mizuno@3well.co.jp',
    phone:              '08064319280',
    prefecture:         '熊本県',
    workStart:          '3ヶ月以内',
    jobType:            ['事務・アシスタント'],
    condition:          ['年収UP', '服装自由'],
    education:          '高校卒業',
    employmentStatus:   '正社員',
    interviewDateTime1: '3/9(月) 15:00-16:00',
    interviewDateTime2: '3/9(月) 16:00-17:00',
    interviewDateTime3: '3/9(月) 17:00-18:00',
  });
}
