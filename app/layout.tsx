import './globals.css';
import type { Metadata } from 'next';
import Pwa from './pwa';
export const metadata: Metadata = {metadataBase:new URL(process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'),title:'Blossom Royall Fashion Mall OS',description:'A calm, connected operating system for commerce, vendors, staff, rent, customers, and intelligence.',icons:{icon:'/icon-v2.png',apple:'/icon-v2.png'},openGraph:{title:'Blossom Royall Fashion Mall OS',description:'Everything the mall needs, in one beautiful place.',images:['/og-v2.png']},twitter:{card:'summary_large_image',title:'Blossom Royall Fashion Mall OS',description:'Everything the mall needs, in one beautiful place.',images:['/og-v2.png']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}<Pwa/></body></html>}
