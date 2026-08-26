import type {MetadataRoute} from 'next';
export const dynamic='force-static';
export default function manifest():MetadataRoute.Manifest{return{name:'Blossom Royall Fashion Mall OS',short_name:'Blossom Royall',description:'Commerce, vendors, staff, rent, customers, and intelligence in one calm operating system.',start_url:'/',display:'standalone',background_color:'#f7f5f2',theme_color:'#7a3048',orientation:'portrait-primary',icons:[{src:'/icon.png',sizes:'1024x1024',type:'image/png',purpose:'maskable'}]}}
