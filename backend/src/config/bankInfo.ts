export const BANK_INFO = {
  bankName: '神戸信用金庫',
  branchName: '本店',
  accountType: '普通',
  accountNumber: '0726786',
  accountHolder: 'ｲｶﾞｻｷ ｺﾞｳﾀ',
  accountHolderKana: 'イガサキ ゴウタ',
  contactEmail: 'igafactory2023@gmail.com'
};

export const getBankTransferInfo = () => {
  return {
    bankName: BANK_INFO.bankName,
    branchName: BANK_INFO.branchName,
    accountType: BANK_INFO.accountType,
    accountNumber: BANK_INFO.accountNumber,
    accountHolder: BANK_INFO.accountHolder,
    contactEmail: BANK_INFO.contactEmail
  };
};

export const getBankTransferText = () => {
  return `
振込先口座情報

銀行名：${BANK_INFO.bankName}
支店名：${BANK_INFO.branchName}
口座種別：${BANK_INFO.accountType}
口座番号：${BANK_INFO.accountNumber}
口座名義：${BANK_INFO.accountHolder}

お問い合わせ：${BANK_INFO.contactEmail}
  `.trim();
}; 
