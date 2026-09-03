// The Fast Cash UI is ported JavaScript; these declarations let TypeScript
// consume it without rewriting every component.
declare module "@/lib/fastcash/translations.js" {
  export const translations: any;
  export const faqListEn: any;
  export const faqListSi: any;
  export const faqListTa: any;
  const _default: any;
  export default _default;
}

declare module "@/components/fastcash/pages.jsx" {
  const anyExport: any;
  export const translations: any;
  export const primaryNav: any;
  export const moreNav: any;
  export const nav: any;
  export const allKnownPages: any;
  export const Header: any;
  export const Home: any;
  export const Deposit: any;
  export const Withdraw: any;
  export const Transactions: any;
  export const Support: any;
  export const Login: any;
  export const Register: any;
  export const PromotionsPage: any;
  export const PrivacyPolicyPage: any;
  export const Guide1xBetPage: any;
  export const GuideSportsPage: any;
  export const GuideCasinoPage: any;
  export const PwaInstallBanner: any;
  export const WhatsAppModal: any;
  export const Info: any;
  export const Empty: any;
  export const Field: any;
  export const CopyButton: any;
  export const getWhatsAppUrl: any;
  export default anyExport;
}

declare module "@/components/fastcash/AdminPanel.jsx" {
  const AdminPanel: any;
  export default AdminPanel;
}

declare module "@/components/fastcash/ReceiptScanner.jsx" {
  const ReceiptScanner: any;
  export default ReceiptScanner;
}

declare module "@/components/fastcash/SportsTips.jsx" {
  const SportsTips: any;
  export default SportsTips;
}
