# FlowStudio (rev 1 · 27 ต.ค. 2569)

แอปวาดผังกระบวนการและผังบทบาท ไฟล์เดียว ใช้ได้ทั้งคอมพ์ (เปิด FlowStudio.html) และแท็บเล็ต (ติดตั้งเป็น PWA จาก GitHub Pages)

## ไฟล์
- FlowStudio.html · flow-core.js · samples.js  ตัวแอป
- assets/  ธีมบ้าน ฟอนต์ Kanit (ฝัง ใช้ออฟไลน์ได้) โครงหน้า
- lib/pptxgen.bundle.js  ใช้ตอนส่งออก PPTX
- manifest.json · sw.js · icon.svg  สำหรับ PWA (ทำงานเมื่อเปิดผ่าน http/https เท่านั้น)
- files/  ที่เก็บไฟล์ผัง .flow.json
- skill/sketch-to-flow.zip  สกิลสำหรับให้ Claude อ่านภาพร่างแล้วเขียน .flow.json (ติดตั้งใน claude.ai > Settings > Skills)

## ขึ้น GitHub Pages สำหรับแท็บเล็ต
1. สร้าง repo ใหม่ (เช่น AnuchaWannagon/flowstudio) คัดลอกทุกไฟล์ในโฟลเดอร์นี้ขึ้นไป (ยกเว้น files/ ถ้ามีผังที่ไม่ต้องการเผยแพร่)
2. Settings > Pages > Deploy from branch main / root
3. บนแท็บเล็ตเปิด https://<user>.github.io/flowstudio/FlowStudio.html ใน Chrome แล้วเลือก "เพิ่มไปยังหน้าจอหลัก"

## ข้อจำกัดที่รู้
- "บันทึก" เขียนลงโฟลเดอร์โดยตรงได้บน Chrome/Edge (File System Access API) · บนแท็บเล็ต Android ไฟล์จะดาวน์โหลดลง Download
- ส่งออก PDF ใช้หน้าพิมพ์ของเบราว์เซอร์ (เลือก "บันทึกเป็น PDF")
- Obsidian canvas วาดเส้นโค้งเอง และไม่มีกรอบประ จึงต่างจากในแอปเล็กน้อย
