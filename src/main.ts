const WD_API_WRAPPER_DOMAIN = "https://wdapi.scpwiki.jp"
const WD_API_WRAPPER_TOKEN = PropertiesService.getScriptProperties().getProperty('WD_API_WRAPPER_TOKEN');

const DISCORD_NOTIFICATION_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('DISCORD_NOTIFICATION_WEBHOOK_URL');

const DRAFT_DATA_SHEET = "data:drafts";

const getDrafts = () => {
  // データ取得
  const url = `${WD_API_WRAPPER_DOMAIN}/scp-jp-sandbox3/pages`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${WD_API_WRAPPER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      "category": "draft sharedpage",
      "tags": "+_event +_criticism-in",
      "id": true
    }),
    muteHttpExceptions: true,

  });

  if (response.getResponseCode() !== 200) {
    console.error(`Failed to fetch drafts: ${response.getContentText()}`);
    return;
  }

  const data = JSON.parse(response.getContentText());

  const drafts = data.map((page: any) => {
    return [
      page.id,
      page.fullname,
      page.name,
      page.category,
      page.title,
      page.children_count,
      page.comments_count,
      page.size,
      page.rating,
      page.votes_count,
      page.rating_percent,
      page.revisions_count,
      page.parent_fullname,
      page.tags.join(','),
      page.created_by.id,
      page.created_by.name,
      page.created_by.unix_name,
      page.created_at,
      page.updated_by.id,
      page.updated_by.name,
      page.updated_by.unix_name,
      page.updated_at,
      page.commented_by ? page.commented_by.id : null,
      page.commented_by ? page.commented_by.name : null,
      page.commented_by ? page.commented_by.unix_name : null,
      page.commented_at ? page.commented_at : null,
      true
    ]
  });

  // 既存データ取得
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DRAFT_DATA_SHEET);
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  const values = range.getValues();

  const latestDraftIds = drafts.map((row: any) => row[0]);
  const knownDraftIds = values.map((row: any) => row[0]);

  let messages = [];

  // データ削除: ないものは末尾セルをfalseに
  for (let i = 0; i < values.length; i++) {
    const draftId = values[i][0];
    if (!latestDraftIds.includes(draftId)) {
      // 既存データの「批評中」フラグがtrueの場合のみ通知
      if (values[i][values[i].length - 1]) {
        values[i][values[i].length - 1] = false;
        // 通知
        messages.push(`**【下書きが「批評中」から外れました】**\n> タイトル：${values[i][4]}\n> 作成者：${values[i][15]}\n> [下書きへのリンク](http://scp-jp-sandbox3.wikidot.com/${values[i][1]}) / [管理シート](https://docs.google.com/spreadsheets/d/1N48wYpWLMSxCZtYCmSLAn4szIbvLraqxsoYnyu08jxo/edit?usp=sharing)`);
      }
    }
  }

  // データ更新: ないものは追加、あるものは更新
  for (const draft of drafts) {
    const draftId = draft[0];
    const index = knownDraftIds.indexOf(draftId);
    if (index === -1) {
      values.push(draft);
      // 通知
      messages.push(`**【下書きが「批評中」になりました】**\n> タイトル：${draft[4]}\n> 作成者：${draft[15]}\n> [下書きへのリンク](http://scp-jp-sandbox3.wikidot.com/${draft[1]}) / [管理シート](https://docs.google.com/spreadsheets/d/1N48wYpWLMSxCZtYCmSLAn4szIbvLraqxsoYnyu08jxo/edit?usp=sharing)`);
    } else {
      // 前のデータの「批評中」フラグとの差分を確認
      if (values[index][values[index].length - 1] !== draft[draft.length - 1]) {
        // 前が批評中
        if (values[index][values[index].length - 1]) {
          messages.push(`**【下書きが「批評中」から外れました】**\n> タイトル：${draft[4]}\n> 作成者：${draft[15]}\n> [下書きへのリンク](http://scp-jp-sandbox3.wikidot.com/${draft[1]}) / [管理シート](https://docs.google.com/spreadsheets/d/1N48wYpWLMSxCZtYCmSLAn4szIbvLraqxsoYnyu08jxo/edit?usp=sharing)`);
        } else {
          messages.push(`**【下書きが「批評中」になりました】**\n> タイトル：${draft[4]}\n> 作成者：${draft[15]}\n> [下書きへのリンク](http://scp-jp-sandbox3.wikidot.com/${draft[1]}) / [管理シート](https://docs.google.com/spreadsheets/d/1N48wYpWLMSxCZtYCmSLAn4szIbvLraqxsoYnyu08jxo/edit?usp=sharing)`);
        }
      }

      values[index] = draft;
    }
  }

  sheet.getRange(2, 1, values.length, values[0].length).setValues(values);

  for (const message of messages) {
    sendDiscordNotification(message);
  }
}

const sendDiscordNotification = (message: string) => {
  const payload = {
    content: message
  };

  UrlFetchApp.fetch(DISCORD_NOTIFICATION_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}