'use client'

// Pixel art character sprites for each agent
// Each sprite is a 16x16 pixel grid rendered as SVG

type PixelGrid = (string | null)[][]

const SKIN = '#fdd'
const SKIN2 = '#ecc'
const HAIR_BK = '#222'
const HAIR_BR = '#634'
const HAIR_BL = '#446'
const SHIRT_W = '#eee'
const SHIRT_B = '#36c'
const SHIRT_G = '#3a6'
const SHIRT_P = '#a4c'
const SHIRT_Y = '#da3'
const SHIRT_T = '#3aa'
const SHIRT_R = '#c44'
const SHIRT_D = '#555'
const PANTS = '#335'
const PANTS2 = '#446'
const SHOE = '#222'
const GLASS = '#4df'
const GLASS2 = '#fff'
const EYE = '#222'
const GOLD = '#fc3'
const BOOK = '#c44'
const BOOK2 = '#3a6'

const sprites: Record<string, PixelGrid> = {
  // เลขา - Female coordinator with hair bun, purple outfit
  'agent-secretary': [
    [null,null,null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null,null],
    [null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null],
    [null,null,null,HAIR_BR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BR,null,null,null,null],
    [null,null,null,HAIR_BR,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,HAIR_BR,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#a4c','#a4c','#a4c','#a4c','#a4c','#a4c','#a4c','#a4c','#a4c',null,null,null,null],
    [null,null,'#a4c','#a4c','#a4c','#a4c',SHIRT_W,'#a4c',SHIRT_W,'#a4c','#a4c','#a4c','#a4c',null,null,null],
    [null,null,'#a4c',SKIN,'#a4c','#a4c','#a4c','#a4c','#a4c','#a4c','#a4c',SKIN,'#a4c',null,null,null],
    [null,null,null,SKIN,'#a4c','#a4c','#a4c','#a4c','#a4c','#a4c','#a4c',SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักเขียนโค้ด - Male coder with glasses, blue shirt
  'agent-coder': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,null,null,null,null],
    [null,null,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,null,null,null],
    [null,null,SHIRT_B,SKIN,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SKIN,SHIRT_B,null,null,null],
    [null,null,null,SKIN,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SHIRT_B,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // ผู้ดูแลระบบ - Sysadmin with headset, dark shirt
  'agent-sysadmin': [
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,SHIRT_D,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,SHIRT_D,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,null,null,null,null],
    [null,null,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,null,null,null],
    [null,null,SHIRT_D,SKIN,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SKIN,SHIRT_D,null,null,null],
    [null,null,null,SKIN,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักสร้างออโตเมชัน - Automation engineer, green shirt
  'agent-automation': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,null,null,null,null],
    [null,null,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,null,null,null],
    [null,null,SHIRT_G,SKIN,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SKIN,SHIRT_G,null,null,null],
    [null,null,null,SKIN,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SHIRT_G,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักออกแบบ Prompt - Purple shirt with glowing eyes
  'agent-prompt': [
    [null,null,null,null,null,'#536',HAIR_BL,HAIR_BL,HAIR_BL,'#536',null,null,null,null,null,null],
    [null,null,null,null,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,null,null,null,null,null],
    [null,null,null,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,null,null,null,null],
    [null,null,null,HAIR_BL,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BL,null,null,null,null],
    [null,null,null,null,SKIN,'#a4f',SKIN,SKIN,SKIN,'#a4f',SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#639','#639','#639','#639','#639','#639','#639','#639','#639',null,null,null,null],
    [null,null,'#639','#639','#639','#639','#a4f','#639','#a4f','#639','#639','#639','#639',null,null,null],
    [null,null,'#639',SKIN,'#639','#639','#639','#639','#639','#639','#639',SKIN,'#639',null,null,null],
    [null,null,null,SKIN,'#639','#639','#639','#639','#639','#639','#639',SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักออกแบบคอร์ส - Female with book, yellow outfit
  'agent-course': [
    [null,null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null,null,null],
    [null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null],
    [null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null],
    [null,null,HAIR_BR,HAIR_BR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BR,HAIR_BR,null,null,null],
    [null,null,null,HAIR_BR,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,HAIR_BR,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,'#c88',SKIN2,'#c88',SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,null,null,null,null],
    [null,null,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,null,null,null],
    [null,null,SHIRT_Y,SKIN,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SKIN,BOOK,null,null,null],
    [null,null,null,SKIN,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SKIN,BOOK,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักสร้างคอนเทนต์ - Creative with spiky hair, pink shirt
  'agent-content': [
    [null,null,null,null,'#c6a',HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,'#c6a',null,null,null,null,null,null],
    [null,null,null,'#c6a',HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,null,null,null,null],
    [null,null,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,null,null,null],
    [null,null,SHIRT_P,SKIN,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SKIN,SHIRT_P,null,null,null],
    [null,null,null,SKIN,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // กราฟฟิคดีไซเนอร์ - Artist with beret, colorful
  'agent-graphic': [
    [null,null,null,null,null,'#c44','#c44','#c44','#c44','#c44','#c44',null,null,null,null,null],
    [null,null,null,null,'#c44','#c44','#c44','#c44','#c44','#c44',null,null,null,null,null,null],
    [null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null],
    [null,null,null,HAIR_BR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BR,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,null,null,null,null],
    [null,null,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,null,null,null],
    [null,null,SHIRT_W,SKIN,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SKIN,SHIRT_W,null,null,null],
    [null,null,null,SKIN,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // ครีเอทีฟ - Creative director, sunglasses, yellow accent
  'agent-creative': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,'#222','#222','#222',SKIN,'#222','#222','#222',null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,null,null,null,null],
    [null,null,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,null,null,null],
    [null,null,SHIRT_Y,SKIN,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SKIN,SHIRT_Y,null,null,null],
    [null,null,null,SKIN,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SHIRT_Y,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักการตลาด - Marketer with tie, green outfit
  'agent-marketing': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,null,null,null,null],
    [null,null,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_G,SHIRT_W,SHIRT_G,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,null,null,null],
    [null,null,SHIRT_W,SKIN,SHIRT_W,SHIRT_W,SHIRT_G,SHIRT_W,SHIRT_G,SHIRT_W,SHIRT_W,SKIN,SHIRT_W,null,null,null],
    [null,null,null,SKIN,SHIRT_W,SHIRT_W,SHIRT_G,SHIRT_W,SHIRT_G,SHIRT_W,SHIRT_W,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักวางกลยุทธ์ - Strategist, suit, glasses
  'agent-strategist': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#334','#334','#334','#334','#334','#334','#334','#334','#334',null,null,null,null],
    [null,null,'#334','#334','#334','#334',SHIRT_W,'#334',SHIRT_W,'#334','#334','#334','#334',null,null,null],
    [null,null,'#334',SKIN,'#334','#334','#c44','#334','#c44','#334','#334',SKIN,'#334',null,null,null],
    [null,null,null,SKIN,'#334','#334','#c44','#334','#c44','#334','#334',SKIN,null,null,null,null],
    [null,null,null,null,null,'#334','#334','#334','#334','#334','#334',null,null,null,null,null],
    [null,null,null,null,null,'#334','#334',null,'#334','#334','#334',null,null,null,null,null],
    [null,null,null,null,null,'#334','#334',null,'#334','#334',null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักข่าว - Journalist with notepad, red accent
  'agent-journalist': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,null,null,null,null],
    [null,null,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,null,null,null],
    [null,null,SHIRT_R,SKIN,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SKIN,SHIRT_W,null,null,null],
    [null,null,null,SKIN,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SKIN,SHIRT_W,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักบัญชี - Accountant, tidy, teal shirt
  'agent-accountant': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,null,null,null,null],
    [null,null,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,null,null,null],
    [null,null,SHIRT_T,SKIN,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SKIN,SHIRT_T,null,null,null],
    [null,null,null,SKIN,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักเทรดทอง - Gold trader, gold accents
  'agent-gold-trader': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#222','#222','#222','#222','#222','#222','#222','#222','#222',null,null,null,null],
    [null,null,'#222','#222','#222','#222',GOLD,'#222',GOLD,'#222','#222','#222','#222',null,null,null],
    [null,null,'#222',SKIN,'#222','#222',GOLD,'#222',GOLD,'#222','#222',SKIN,'#222',null,null,null],
    [null,null,null,SKIN,'#222','#222',GOLD,'#222',GOLD,'#222','#222',SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Project Manager - teal shirt, glasses, white tie
  'agent-07f02e89': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#0cc','#0cc','#0cc','#0cc','#0cc','#0cc','#0cc','#0cc','#0cc',null,null,null,null],
    [null,null,'#0cc','#0cc','#0cc','#0cc',SHIRT_W,'#0cc',SHIRT_W,'#0cc','#0cc','#0cc','#0cc',null,null,null],
    [null,null,'#0cc',SKIN,'#0cc','#0cc',SHIRT_W,'#0cc',SHIRT_W,'#0cc','#0cc',SKIN,'#0cc',null,null,null],
    [null,null,null,SKIN,'#0cc','#0cc',SHIRT_W,'#0cc',SHIRT_W,'#0cc','#0cc',SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Business Analyst - sky blue shirt, glasses, document on side
  'agent-57d2e284': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#29e','#29e','#29e','#29e','#29e','#29e','#29e','#29e','#29e',null,null,null,null],
    [null,null,'#29e','#29e','#29e','#29e','#29e','#29e','#29e','#29e','#29e','#29e','#29e',null,null,null],
    [null,null,'#29e',SKIN,'#29e','#29e','#29e','#29e','#29e','#29e','#29e',SKIN,BOOK2,null,null,null],
    [null,null,null,SKIN,'#29e','#29e','#29e','#29e','#29e','#29e','#29e',SKIN,BOOK2,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // QA Engineer - orange shirt, sharp eyes
  'agent-c341d53f': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#e73','#e73','#e73','#e73','#e73','#e73','#e73','#e73','#e73',null,null,null,null],
    [null,null,'#e73','#e73','#e73','#e73','#e73','#e73','#e73','#e73','#e73','#e73','#e73',null,null,null],
    [null,null,'#e73',SKIN,'#e73','#e73','#e73','#e73','#e73','#e73','#e73',SKIN,'#e73',null,null,null],
    [null,null,null,SKIN,'#e73','#e73','#e73','#e73','#e73','#e73','#e73',SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // UX Designer - magenta shirt, dark blue hair, stylish
  'agent-cf77e6c1': [
    [null,null,null,null,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,null,null,null,null,null,null],
    [null,null,null,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,null,null,null,null,null],
    [null,null,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,HAIR_BL,null,null,null,null],
    [null,null,HAIR_BL,HAIR_BL,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BL,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,'#c89',SKIN2,'#c89',SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d',null,null,null,null],
    [null,null,'#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d',null,null,null],
    [null,null,'#c4d',SKIN,'#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d',SKIN,'#c4d',null,null,null],
    [null,null,null,SKIN,'#c4d','#c4d','#c4d','#c4d','#c4d','#c4d','#c4d',SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Technical Writer - lime green shirt, brown hair, notebook on side
  'agent-4ccbaf58': [
    [null,null,null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null,null],
    [null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null],
    [null,null,null,HAIR_BR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BR,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3',null,null,null,null],
    [null,null,'#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3',null,null,null],
    [null,null,'#7b3',SKIN,'#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3',SKIN,BOOK,null,null,null],
    [null,null,null,SKIN,'#7b3','#7b3','#7b3','#7b3','#7b3','#7b3','#7b3',SKIN,BOOK,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Chief of Staff - Gray suit, gray hair, glasses, gold medal
  'agent-f0319677': [
    [null,null,null,null,null,'#aaa','#aaa','#aaa','#aaa','#aaa',null,null,null,null,null,null],
    [null,null,null,null,'#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa',null,null,null,null,null],
    [null,null,null,'#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa','#aaa',null,null,null,null],
    [null,null,null,'#aaa',SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,'#aaa',null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#6b7280','#6b7280','#6b7280','#6b7280',SHIRT_W,'#6b7280','#6b7280','#6b7280','#6b7280',null,null,null,null],
    [null,null,'#6b7280','#6b7280','#6b7280','#6b7280',SHIRT_W,SHIRT_W,SHIRT_W,'#6b7280','#6b7280','#6b7280','#6b7280',null,null,null],
    [null,null,'#6b7280',SKIN,'#6b7280','#6b7280','#6b7280',GOLD,'#6b7280','#6b7280','#6b7280',SKIN,'#6b7280',null,null,null],
    [null,null,null,SKIN,'#6b7280','#6b7280','#6b7280',GOLD,'#6b7280','#6b7280','#6b7280',SKIN,null,null,null,null],
    [null,null,null,null,null,'#374151','#374151','#374151','#374151','#374151','#374151',null,null,null,null,null],
    [null,null,null,null,null,'#374151','#374151',null,'#374151','#374151','#374151',null,null,null,null,null],
    [null,null,null,null,null,'#374151','#374151',null,'#374151','#374151',null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Front-end Developer - Amber shirt, spiky hair, creative vibe
  'agent-e8a334c6': [
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,GOLD,HAIR_BK,HAIR_BK,HAIR_BK,GOLD,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#da3','#da3','#da3','#da3','#da3','#da3','#da3','#da3','#da3',null,null,null,null],
    [null,null,'#da3','#da3','#da3','#da3','#da3','#da3','#da3','#da3','#da3','#da3','#da3',null,null,null],
    [null,null,'#da3',SKIN,'#da3','#da3','#da3','#da3','#da3','#da3','#da3',SKIN,'#da3',null,null,null],
    [null,null,null,SKIN,'#da3','#da3','#da3','#da3','#da3','#da3','#da3',SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Back-end Developer - Purple shirt, black hair
  'agent-cc4d3a23': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed',null,null,null,null],
    [null,null,'#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed',null,null,null],
    [null,null,'#7c3aed',SKIN,'#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed',SKIN,'#7c3aed',null,null,null],
    [null,null,null,SKIN,'#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed','#7c3aed',SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Tech Lead - Red shirt, glasses, white tie (authority look)
  'agent-a435cfbb': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_W,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,null,null,null,null],
    [null,null,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_R,null,null,null],
    [null,null,SHIRT_R,SKIN,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_W,SHIRT_R,SHIRT_R,SHIRT_R,SKIN,SHIRT_R,null,null,null],
    [null,null,null,SKIN,SHIRT_R,SHIRT_R,SHIRT_R,SHIRT_W,SHIRT_R,SHIRT_R,SHIRT_R,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // DevOps Engineer - Cyan shirt, glasses, wrench tool
  'agent-eeb5e489': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc',null,null,null,null],
    [null,null,'#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc',null,null,null],
    [null,null,'#0bc',SKIN,'#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc',SKIN,GOLD,null,null,null],
    [null,null,null,SKIN,'#0bc','#0bc','#0bc','#0bc','#0bc','#0bc','#0bc',SKIN,GOLD,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // นักวิเคราะห์หุ้น - Analyst with blue suit, chart accent
  'agent-stock-analyst': [
    [null,null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null,null],
    [null,null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null],
    [null,null,null,HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,GLASS,EYE,GLASS,SKIN,GLASS,EYE,GLASS,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,'#247','#247','#247','#247','#247','#247','#247','#247','#247',null,null,null,null],
    [null,null,'#247','#247','#247','#247',SHIRT_W,'#247',SHIRT_W,'#247','#247','#247','#247',null,null,null],
    [null,null,'#247',SKIN,'#247','#247','#36c','#247','#36c','#247','#247',SKIN,'#247',null,null,null],
    [null,null,null,SKIN,'#247','#247','#36c','#247','#36c','#247','#247',SKIN,null,null,null,null],
    [null,null,null,null,null,'#247','#247','#247','#247','#247','#247',null,null,null,null,null],
    [null,null,null,null,null,'#247','#247',null,'#247','#247','#247',null,null,null,null,null],
    [null,null,null,null,null,'#247','#247',null,'#247','#247',null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // UX / Product Designer — female, purple outfit, holding stylus
  'agent-ux-designer': [
    [null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,HAIR_BR,null,null],
    [null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,HAIR_BR,null,null],
    [null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null],
    [null,null,null,HAIR_BR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BR,null,null,null,null],
    [null,null,null,HAIR_BR,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,HAIR_BR,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,'#e8a','#e8a',SKIN2,'#e8a','#e8a',SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,null,null,null,null],
    [null,null,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_W,SHIRT_P,SHIRT_W,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,null,null,null],
    [null,null,SHIRT_P,SKIN,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SKIN,SHIRT_P,null,GOLD,null],
    [null,null,null,SKIN,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SHIRT_P,SKIN,null,null,GOLD,null],
    [null,null,null,null,null,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,PANTS2,null,null,null,null,null],
    [null,null,null,null,null,PANTS2,PANTS2,null,PANTS2,PANTS2,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Security / DevSecOps — hoodie, red accent, serious
  'agent-security': [
    [null,null,null,'#311','#311','#311','#311','#311','#311','#311','#311',null,null,null,null,null],
    [null,null,'#311','#311','#c44','#311','#311','#311','#311','#311','#311','#311',null,null,null,null],
    [null,null,'#311','#311','#311','#311','#311','#311','#311','#311','#311','#311',null,null,null,null],
    [null,null,'#311','#311',SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,'#311',null,null,null,null],
    [null,null,null,'#311',SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,'#311',null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,'#311','#311','#311','#311','#311','#311','#311','#311','#311','#311',null,null,null,null],
    [null,'#311','#311','#311','#311','#c44','#311','#311','#311','#c44','#311','#311','#311',null,null,null],
    [null,'#311','#311',SKIN,'#311','#311','#311','#311','#311','#311','#311',SKIN,'#311',null,null,null],
    [null,null,null,SKIN,'#311','#311','#311','#311','#311','#311','#311',SKIN,null,null,null,null],
    [null,null,null,null,null,'#311','#311','#311','#311','#311','#311',null,null,null,null,null],
    [null,null,null,null,null,'#311','#311',null,'#311','#311','#311',null,null,null,null,null],
    [null,null,null,null,null,'#311','#311',null,'#311','#311',null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // Product Owner / PM — suit+tie, clipboard
  'agent-product-owner': [
    [null,null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null,null,null],
    [null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null,null],
    [null,null,null,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,HAIR_BR,null,null,null,null],
    [null,null,null,HAIR_BR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BR,null,null,null,null],
    [null,null,null,null,SKIN,EYE,SKIN,SKIN,SKIN,EYE,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_W,null,null,null,null],
    [null,null,SHIRT_D,SHIRT_W,SHIRT_W,SHIRT_W,'#36c',SHIRT_W,'#36c',SHIRT_W,SHIRT_W,SHIRT_W,SHIRT_D,null,null,null],
    [null,null,SHIRT_D,SKIN,SHIRT_W,SHIRT_W,'#36c',SHIRT_W,'#36c',SHIRT_W,SHIRT_W,SKIN,SHIRT_D,BOOK2,BOOK2,null],
    [null,null,null,SKIN,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SHIRT_D,SKIN,null,BOOK2,BOOK2,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],

  // SRE / Platform Engineer — headset, teal shirt, terminal glow eyes
  'agent-sre': [
    [null,null,null,'#0aa',HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,'#0aa',null,null,null,null,null],
    [null,null,null,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,null,null,null,null,null],
    [null,null,'#0aa',HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,HAIR_BK,'#0aa',null,null,null,null],
    [null,null,'#0aa',HAIR_BK,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR_BK,null,null,null,null],
    [null,null,null,null,SKIN,GLASS,EYE,SKIN,EYE,GLASS,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN,SKIN2,SKIN,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,SKIN,SKIN,SKIN2,SKIN2,SKIN2,SKIN,SKIN,null,null,null,null,null],
    [null,null,null,null,null,SKIN,SKIN,SKIN,SKIN,SKIN,null,null,null,null,null,null],
    [null,null,null,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,null,null,null,null],
    [null,null,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,SHIRT_T,null,null,null],
    [null,null,SHIRT_T,SKIN,SHIRT_T,SHIRT_T,'#0dd',SHIRT_T,'#0dd',SHIRT_T,SHIRT_T,SKIN,SHIRT_T,null,null,null],
    [null,null,null,SKIN,SHIRT_T,SHIRT_T,'#0dd',SHIRT_T,'#0dd',SHIRT_T,SHIRT_T,SKIN,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,PANTS,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,PANTS,null,null,null,null,null],
    [null,null,null,null,null,PANTS,PANTS,null,PANTS,PANTS,null,null,null,null,null,null],
    [null,null,null,null,SHOE,SHOE,SHOE,null,SHOE,SHOE,SHOE,null,null,null,null,null],
  ],
}

const PX = 5 // pixel size

function renderSVG(grid: PixelGrid): string {
  let rects = ''
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x]
      if (c) {
        rects += `<rect x="${x * PX}" y="${y * PX}" width="${PX}" height="${PX}" fill="${c}"/>`
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${16 * PX} ${16 * PX}" shape-rendering="crispEdges">${rects}</svg>`
}

// Pre-render all SVGs
const svgCache: Record<string, string> = {}
for (const [id, grid] of Object.entries(sprites)) {
  svgCache[id] = `data:image/svg+xml,${encodeURIComponent(renderSVG(grid))}`
}

export default function PixelSprite({ agentId, size = 72 }: { agentId: string; size?: number }) {
  const src = svgCache[agentId]

  if (!src) {
    // fallback: colored rectangle
    return (
      <div
        style={{ width: size, height: size, background: '#1a2030', borderRadius: 4 }}
        className="flex items-center justify-center"
      >
        <span style={{ fontSize: size * 0.5 }}>?</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated' }}
      draggable={false}
    />
  )
}
