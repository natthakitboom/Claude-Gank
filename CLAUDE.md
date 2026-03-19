1. Project Overview 🌐
- อธิบายว่า product คืออะไร ใครใช้ และ optimize เพื่ออะไร
- ระบุ business/UX constraints ที่สำคัญ
- เขียนสั้นไม่เกิน 2–3 ย่อหน้า
❌ "We value innovation and customer satisfaction"
✅ "B2C fashion app สำหรับคนอายุ 20–35 บนมือถือ optimize สำหรับ mobile checkout และ Core Web Vitals"
2. Tech Stack 🛠️
- ระบุ framework, language, styling, state management, testing, และ backend/data layer
- ใส่ version ที่ใช้จริง อย่าเขียนแค่ "React stack"
- บอก explicit ว่า library ไหนห้ามใช้
❌ "React stack ใช้ CSS framework มี Database"
✅ "Next.js 15 + TypeScript strict + Tailwind | ห้ามใช้ Redux, Material UI *unless explicitly requested* "
3. Architecture 🏗️
- อธิบาย major directories และ responsibility ของแต่ละ layer
- บอก decision rules ว่าโค้ดใหม่ควรไปอยู่ที่ไหน ไม่ใช่แค่ชื่อ folder
- เพิ่ม "where new things go" ให้ชัด
❌ "src/components contains components"
✅ "feature ใหม่ → features/{name}/, API calls → lib/ เท่านั้น, ห้าม side effects ใน UI components"
4. Coding Conventions 💻
- ครอบคลุม naming, typing, component patterns, error handling, async
- rules ต้องชัดพอที่ AI จะ follow ได้โดยอัตโนมัติ
- ระบุขนาด file ที่ยอมรับได้
❌ "Write clean code"
✅ "No any, named exports only, async/await เท่านั้น, components ไม่เกิน 200 บรรทัด"
5. UI & Design System 🎨
- บอก component library และ usage rules
- ระบุ spacing system, typography, และ color usage
- กำหนด accessibility expectations
❌ "Make it look modern and clean"
✅ "8px spacing rhythm, shadcn/ui primitives เท่านั้น, ทุก interactive element ต้องมี hover + focus + disabled states"
6. Content & Copy ✍️
- บอก tone ให้ชัด ทั้ง pattern ที่ใช้ และห้ามใช้
- ใส่ตัวอย่าง copy ที่ดีสำหรับ product
- ครอบคลุม error messages และ CTA labels
❌ "Be friendly and professional"
✅ "CTA ใช้ action verbs เท่านั้น, ห้ามใช้ 'World-class' หรือ 'Seamless', price แสดงเป็น ฿1,290 เสมอ"
7. Testing & Quality 🧪
- บอก checklist ก่อนถือว่า task complete
- ระบุว่า component ไหนต้องมี test ไหนไม่ต้อง
- กำหนด states ที่ต้องตรวจสอบเสมอ
❌ "Write tests and make sure things work"
✅ "ก่อน complete ทุก task: typecheck → lint → relevant tests ผ่านก่อน, checkout flow ต้องมี E2E coverage"
8. File Placement 📂
- กำหนดชัดว่าไฟล์ใหม่แต่ละประเภทไปอยู่ที่ไหน
- บอกเงื่อนไขว่าเมื่อไหรควรแก้ของเก่า vs สร้างใหม่
- ระบุ naming pattern ที่ใช้
❌ "Put files in the right folder"
✅ "UI primitives → components/ui/, feature logic → features/{name}/, แก้ existing component ก่อนเสมอ"
9. Safety Rules ⚠️
ระบุว่า code ส่วนไหนที่ห้ามแตะโดยไม่มี explicit request
AI จะไม่รู้เองว่าอะไรคือ "อันตราย" ถ้าไม่บอก
- ระบุ files, routes, flows ที่ sensitive
- บอกให้ flag และรอ approval ก่อน implement เสมอ
- ครอบคลุม database schema และ auth flows
❌ "Be careful with important stuff"
✅ "ห้าม modify auth flow, Stripe webhook handler, Supabase schema — flag ก่อน implement เสมอ"
10. Commands ⌨️
- ใส่ commands จริงที่ใช้งานได้เลย พร้อม context ที่จำเป็น
- ระบุ port หรือ environment ที่จำเป็น
- บอก database commands ที่ safe ให้รันได้
❌ "run the app and tests"
✅ "bun dev → localhost:3000, bun test"
11. Security Rules 🛡️ (ผมมองว่าสำคัญที่สุด)
ถ้าข้อ 9 คือ "ห้ามแตะโค้ดส่วนไหน" — ข้อนี้คือ "ห้ามทำอะไรกับ secrets และ sensitive data"
สิ่งที่ AI coding agent มักพลาดโดยไม่ตั้งใจ และแก้ยากที่สุดหลัง push code ไปแล้ว
- ห้าม commit ไฟล์ที่มี secrets ทุกกรณี
- แยกให้ชัดว่า key ไหน server-side เท่านั้น
- ห้าม log sensitive data ในทุก environment
❌ "Keep API keys safe and secure"
✅ "ห้าม commit .env, ห้าม log user.password หรือ payment body, Stripe secret key → server-side เท่านั้น"
สรุปสุดท้ายก่อนจะ push ขึ้น repo 🏁
🔹 CLAUDE.md คือการ onboard Claude เข้า codebase ต้องบอกให้ได้ว่า WHY, WHAT, HOW
🔹 ตั้งเป้าไม่เกิน 200 บรรทัด ยิ่ง instruction เยอะ AI ยิ่ง follow ได้แย่ลงทุกข้อ ไม่ใช่แค่ข้อสุดท้าย
🔹 ใส่เฉพาะ instruction ที่ใช้กับทุก task สิ่งที่ใช้เฉพาะบาง task ส่งผ่าน prompt แทน
🔹 อย่ายัดทุกอย่างที่ Claude ควรรู้ลงไปตรง ๆ แต่บอกให้รู้ว่า ไปหาข้อมูลได้ที่ไหน เพื่อไม่ให้ context บวมโดยไม่จำเป็น
🔹 Claude ไม่ใช่ linter ใช้ ESLint และ Prettier แทนในส่วนที่ทำได้
🔹 run /init เป็นจุดเริ่มต้น แล้วตัดสิ่งที่ไม่จำเป็นออก CLAUDE.md คือจุดที่ส่งผลต่อคุณภาพงานมากที่สุด การเขียนอย่างดีจึงคุ้มค่ากว่าการปล่อยให้ AI เขียนให้เองทั้งหมด
🔹 CLAUDE.md ควรอัปเดตสม่ำเสมอ เมื่อ project เพิ่ม library ใหม่, เปลี่ยน workflow, หรือเจอ pattern ที่ AI ทำผิดซ้ำ ให้แก้ไฟล์นี้ทันที อย่าเขียนครั้งเดียวแล้วปล่อยทิ้ง