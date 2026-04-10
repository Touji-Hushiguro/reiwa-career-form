// ============================================================
// れいわキャリア フォーム doPost 統合版
// 2段階送信対応: firstSubmit（電話番号取得）/ finalSubmit（全データ完了）
// Slack通知: firstSubmitのみ発火
// 自動返信メール: finalSubmitのみ発火
// ============================================================

var SPREADSHEET_ID = '1Vq0uK-w9M4EKft3l1TyzNz06yPrhtTTovH0Nb7inM1w';
var SHEET_NAME     = '顧客データDB';
var SLACK_URL      = 'YOUR_SLACK_WEBHOOK_URL'; // GASエディタ上で実際のURLに書き換えてください

// カレンダー連携設定
var CALENDAR_ID        = 'box-reiwa_reservation@box-hr.co.jp';
var TZ                 = 'Asia/Tokyo';
var SLOT_MINUTES       = 15;        // 1枠の長さ
var BUSINESS_START_HOUR = 11;       // 営業開始時刻
var BUSINESS_END_HOUR   = 20;       // 営業終了時刻（20時ちょうどで終了→最終枠は19:45-20:00）
var LEAD_TIME_MINUTES  = 30;        // 現在時刻から何分後以降を候補にするか

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
  INTERVIEW_3:       15, // O
  UTM_SOURCE:        16, // P 配信媒体
  UTM_CONTENT:       17  // Q CR識別子
};

var TOTAL_COLS = 17;

// ============================================================
// メイン
// ============================================================

// ============================================================
// doGet: カレンダー空き枠取得エンドポイント
// ?action=quick_slots  → 今日/明日/明後日から最速1枠ずつ（最大3枠）
// ?action=all_slots    → 今後N日の全空き枠
// ============================================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'quick_slots';
    var result;
    if (action === 'all_slots') {
      var days = parseInt((e && e.parameter && e.parameter.days) || '14', 10);
      result = getAllAvailableSlots(days);
    } else {
      result = getQuickSlots();
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, slots: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doGetエラー: ' + err);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 今日・明日・明後日 から「最も早い空き15分枠」を1つずつ返す
function getQuickSlots() {
  var now = new Date();
  var results = [];
  for (var i = 0; i < 3; i++) {
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    var slot = findEarliestSlotOfDay(day, now);
    if (slot) results.push(slot);
  }
  return results;
}

// 指定日数分の全15分空き枠を返す（「その他」用）
function getAllAvailableSlots(days) {
  var now = new Date();
  var results = [];
  for (var i = 0; i < days; i++) {
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    var daySlots = findAllSlotsOfDay(day, now);
    for (var j = 0; j < daySlots.length; j++) {
      results.push(daySlots[j]);
    }
  }
  return results;
}

// 指定日の最も早い空き枠を返す
function findEarliestSlotOfDay(day, now) {
  var slots = findAllSlotsOfDay(day, now);
  return slots.length > 0 ? slots[0] : null;
}

// 指定日の全空き枠を返す（昇順）
function findAllSlotsOfDay(day, now) {
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error('カレンダーが見つかりません: ' + CALENDAR_ID);

  var dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), BUSINESS_START_HOUR, 0, 0);
  var dayEnd   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), BUSINESS_END_HOUR, 0, 0);

  // リードタイムを考慮した「候補にできる最も早い時刻」
  var earliestStart = new Date(now.getTime() + LEAD_TIME_MINUTES * 60 * 1000);
  // SLOT_MINUTES単位に切り上げ
  earliestStart.setSeconds(0, 0);
  var remainder = earliestStart.getMinutes() % SLOT_MINUTES;
  if (remainder !== 0) {
    earliestStart.setMinutes(earliestStart.getMinutes() + (SLOT_MINUTES - remainder));
  }

  // その日の実際の開始時刻
  var scanStart = dayStart.getTime() < earliestStart.getTime() ? earliestStart : dayStart;
  if (scanStart.getTime() >= dayEnd.getTime()) return [];

  // その日の予定を取得
  var events = cal.getEvents(dayStart, dayEnd);

  var result = [];
  var cursor = new Date(scanStart.getTime());
  while (cursor.getTime() + SLOT_MINUTES * 60 * 1000 <= dayEnd.getTime()) {
    var slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60 * 1000);
    if (!isOverlapping(cursor, slotEnd, events)) {
      result.push(formatSlot(cursor, slotEnd));
    }
    cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60 * 1000);
  }
  return result;
}

function isOverlapping(slotStart, slotEnd, events) {
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var evStart = ev.getStartTime();
    var evEnd   = ev.getEndTime();
    // 終日イベントは営業時間全体をブロックとみなす
    if (ev.isAllDayEvent && ev.isAllDayEvent()) return true;
    if (slotStart.getTime() < evEnd.getTime() && slotEnd.getTime() > evStart.getTime()) {
      return true;
    }
  }
  return false;
}

function formatSlot(start, end) {
  var days = ['日', '月', '火', '水', '木', '金', '土'];
  var dateLabel = (start.getMonth() + 1) + '/' + start.getDate() + '(' + days[start.getDay()] + ')';
  var timeLabel = pad2(start.getHours()) + ':' + pad2(start.getMinutes()) + '〜' +
                  pad2(end.getHours()) + ':' + pad2(end.getMinutes());
  return {
    dateLabel: dateLabel,
    timeLabel: timeLabel,
    label: dateLabel + ' ' + timeLabel,
    start: Utilities.formatDate(start, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    end:   Utilities.formatDate(end,   TZ, "yyyy-MM-dd'T'HH:mm:ssXXX")
  };
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

// ============================================================
// doPost: メイン（既存）
// ============================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    var jsonString = e.parameter.data || e.postData.getDataAsString();
    var data = JSON.parse(jsonString);
    var action = data.action || 'legacy';

    // ========== SMS認証（Twilio Verify） ==========
    if (action === 'sendOTP') {
      return handleSendOTP(data);
    } else if (action === 'verifyOTP') {
      return handleVerifyOTP(data);

    } else if (action === 'firstSubmit') {
      // 電話番号取得タイミング: 新規行追加のみ（Slack通知はfinalSubmitで希望日時含めて送信）
      writeNewRow(sheet, data);

    } else if (action === 'finalSubmit') {
      // 完了タイミング: 既存行を全データ上書き + カレンダー登録 + Slack通知 + 自動返信メール
      var rowIndex = findRowByPhone(sheet, data.phone || '');
      if (rowIndex > 0) {
        updateRow(sheet, rowIndex, data);
      } else {
        writeNewRow(sheet, data);
      }
      try { createInterviewEvent(data); } catch(calErr) { Logger.log('カレンダーエラー: ' + calErr); }
      try { notifySlack(data); } catch(slackErr) { Logger.log('Slackエラー: ' + slackErr); }
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
    data.interviewDateTime3 || '',
    data.utmSource        || '',
    data.utmContent       || ''
  ];
}

function writeNewRow(sheet, data) {
  var values = sheet.getRange('A:A').getValues();
  var lastRow = 0;
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] !== '') lastRow = i + 1;
  }
  var newRow = lastRow + 1;
  sheet.getRange(newRow, 1, 1, TOTAL_COLS).setValues([buildRow(data)]);
}

function updateRow(sheet, rowIndex, data) {
  // タイムスタンプは第1送信時のものを保持
  var existingTimestamp = sheet.getRange(rowIndex, COL.TIMESTAMP).getValue();
  var ts = existingTimestamp
    ? Utilities.formatDate(new Date(existingTimestamp), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss')
    : Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  // firstSubmitで書き込んだUTMを保持する（finalSubmitで空になっていた場合の念のため）
  var mergedData = mergeUtmFromExisting(sheet, rowIndex, data);
  sheet.getRange(rowIndex, 1, 1, TOTAL_COLS).setValues([buildRow(mergedData, ts)]);
}

function mergeUtmFromExisting(sheet, rowIndex, data) {
  var merged = {};
  for (var k in data) merged[k] = data[k];
  if (!merged.utmSource) {
    var existingSource = sheet.getRange(rowIndex, COL.UTM_SOURCE).getValue();
    if (existingSource) merged.utmSource = String(existingSource);
  }
  if (!merged.utmContent) {
    var existingContent = sheet.getRange(rowIndex, COL.UTM_CONTENT).getValue();
    if (existingContent) merged.utmContent = String(existingContent);
  }
  return merged;
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
// カレンダーイベント作成（finalSubmitで呼ばれる）
// ダブルブッキング許容: 空き状況チェックなしで強制作成
// ============================================================

function createInterviewEvent(data) {
  if (!data.interviewStart || !data.interviewEnd) {
    Logger.log('カレンダー: start/end未指定のためスキップ (label=' + (data.interviewDateTime1 || '') + ')');
    return;
  }
  var cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) {
    throw new Error('カレンダーが見つかりません: ' + CALENDAR_ID);
  }
  var startDate = new Date(data.interviewStart);
  var endDate   = new Date(data.interviewEnd);
  var name = data.fullName || 'お客様';
  var title = '【架電】' + name + '様 予約用カレンダー';
  var description = buildEventDescription(data);
  cal.createEvent(title, startDate, endDate, { description: description });
  Logger.log('✅ カレンダー登録: ' + title + ' @ ' + Utilities.formatDate(startDate, TZ, 'yyyy/MM/dd HH:mm'));
}

function buildEventDescription(data) {
  var lines = [];
  lines.push('━━━ 応募内容 ━━━');
  lines.push('お名前: ' + (data.fullName || ''));
  lines.push('電話: ' + (data.phone || ''));
  lines.push('メール: ' + (data.email || ''));
  lines.push('生年月日: ' + (data.birthDate || ''));
  lines.push('性別: ' + (data.gender || ''));
  lines.push('都道府県: ' + (data.prefecture || ''));
  lines.push('転職希望時期: ' + (data.workStart || ''));
  lines.push('希望日時: ' + (data.interviewDateTime1 || ''));
  lines.push('');
  lines.push('━━━ スプレッドシート ━━━');
  lines.push('https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID);
  return lines.join('\n');
}

// ============================================================
// Slack通知（firstSubmitのみ呼ばれる）
// ============================================================

function notifySlack(data) {
  var lines = [];
  lines.push('<@U0ABRUC6JRE> :mega: 新しい応募');
  lines.push('名前: ' + (data.fullName || '未入力'));
  lines.push('電話: ' + (data.phone || '未入力'));
  lines.push('予約日時: ' + (data.interviewDateTime1 || '未入力'));
  lines.push('メール: ' + (data.email || '未入力'));
  lines.push('都道府県: ' + (data.prefecture || '未入力'));
  lines.push('転職希望時期: ' + (data.workStart || '未入力'));
  lines.push('配信媒体: ' + (data.utmSource || '不明'));
  lines.push('CR: ' + (data.utmContent || '不明'));
  lines.push('<https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit|スプレッドシート>');
  var message = { text: lines.join('\n') };
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
// SMS認証（Twilio Verify API）
// ============================================================

function getTwilioCredentials() {
  var props = PropertiesService.getScriptProperties();
  return {
    accountSid:  props.getProperty('TWILIO_ACCOUNT_SID'),
    authToken:   props.getProperty('TWILIO_AUTH_TOKEN'),
    verifySid:   props.getProperty('TWILIO_VERIFY_SID')
  };
}

function normalizePhoneJP(phone) {
  var digits = String(phone).replace(/[-\s\u3000]/g, '');
  if (digits.charAt(0) === '0') digits = digits.substring(1);
  return '+81' + digits;
}

function handleSendOTP(data) {
  var phone = normalizePhoneJP(data.phone || '');
  if (!phone || phone.length < 12) {
    return jsonResponse({ success: false, error: '電話番号が不正です' });
  }
  var tw = getTwilioCredentials();
  var url = 'https://verify.twilio.com/v2/Services/' + tw.verifySid + '/Verifications';
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: { To: phone, Channel: 'sms' },
    headers: {
      Authorization: 'Basic ' + Utilities.base64Encode(tw.accountSid + ':' + tw.authToken)
    },
    muteHttpExceptions: true
  });
  var result = JSON.parse(response.getContentText());
  if (result.status === 'pending') {
    Logger.log('✅ OTP送信: ' + phone);
    return jsonResponse({ success: true });
  } else {
    Logger.log('❌ OTP送信失敗: ' + response.getContentText());
    return jsonResponse({ success: false, error: result.message || 'SMS送信に失敗しました' });
  }
}

function handleVerifyOTP(data) {
  var phone = normalizePhoneJP(data.phone || '');
  var code = String(data.code || '').trim();
  if (!phone || !code) {
    return jsonResponse({ success: false, error: '電話番号またはコードが不正です' });
  }
  var tw = getTwilioCredentials();
  var url = 'https://verify.twilio.com/v2/Services/' + tw.verifySid + '/VerificationChecks';
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: { To: phone, Code: code },
    headers: {
      Authorization: 'Basic ' + Utilities.base64Encode(tw.accountSid + ':' + tw.authToken)
    },
    muteHttpExceptions: true
  });
  var result = JSON.parse(response.getContentText());
  if (result.status === 'approved') {
    Logger.log('✅ OTP認証成功: ' + phone);
    return jsonResponse({ success: true, verified: true });
  } else {
    Logger.log('❌ OTP認証失敗: ' + result.status);
    return jsonResponse({ success: false, error: 'コードが正しくありません' });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
