/**
 * 精确切割脚本（基于1408×768实测坐标）
 *
 * 图片布局：
 * - 角色：x:0~422, 全高
 * - 服装行1（上半）：y:0~399
 *   - 春日轻纱裙: x~430~730
 *   - 夏荷碧裳:   x~735~1035
 *   - 秋枫锦袍:   x~1035~1408（只取到1360左右）
 * - 服装行2（下半）：y:350~768
 *   - 冬梅白衣:   x~430~730
 *   - 凤凰宫装:   x~735~1058
 * - 配饰（右下2×2）：x~1060~1408, y~350~768
 */

const sharp = require('./node_modules/sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../frontend/src/components/img.png');
const OUT_DIR = path.join(__dirname, '../frontend/public/assets');

fs.mkdirSync(path.join(OUT_DIR, 'character'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'dresses'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'accessories'), { recursive: true });

// 图片实际尺寸 1408 × 768
const crops = [
  // ===== 角色（左侧区域完整人物）=====
  {
    name: 'character/base',
    region: { left: 0, top: 0, width: 422, height: 768 }
  },

  // ===== 服装第1行（上半，y: 0~400）=====
  {
    name: 'dresses/spring_light',   // 春日轻纱裙（粉绿渐变）
    region: { left: 420, top: 10, width: 300, height: 390 }
  },
  {
    name: 'dresses/summer_lotus',   // 夏荷碧裳（荷花绿白）
    region: { left: 720, top: 10, width: 310, height: 390 }
  },
  {
    name: 'dresses/autumn_maple',   // 秋枫锦袍（橙红）
    region: { left: 1040, top: 10, width: 330, height: 390 }
  },

  // ===== 服装第2行（下半，y: 380~768）=====
  {
    name: 'dresses/winter_plum',    // 冬梅白衣（白+红梅）
    region: { left: 420, top: 380, width: 300, height: 380 }
  },
  {
    name: 'dresses/court_phoenix',  // 凤凰宫装（暗红+金凤）
    region: { left: 720, top: 380, width: 320, height: 380 }
  },

  // ===== 配饰区（右下2×2网格）=====
  // 碧玉簪（左上）
  {
    name: 'accessories/jade_hairpin',
    region: { left: 1048, top: 380, width: 185, height: 196 }
  },
  // 金凤冠（右上）
  {
    name: 'accessories/gold_phoenix_crown',
    region: { left: 1228, top: 380, width: 178, height: 196 }
  },
  // 南珠耳环（左下）
  {
    name: 'accessories/pearl_earrings',
    region: { left: 1048, top: 570, width: 185, height: 196 }
  },
  // 翡翠手镯（右下）
  {
    name: 'accessories/jade_bracelet',
    region: { left: 1228, top: 570, width: 178, height: 196 }
  },
];

let done = 0;
crops.forEach(({ name, region }) => {
  const outPath = path.join(OUT_DIR, name + '.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  sharp(SRC)
    .extract({
      left: Math.max(0, region.left),
      top: Math.max(0, region.top),
      width: Math.min(region.width, 1408 - region.left),
      height: Math.min(region.height, 768 - region.top),
    })
    .png()
    .toFile(outPath, (err) => {
      if (err) console.error(`❌ ${name}:`, err.message);
      else console.log(`✅ ${name}: ${region.width}×${region.height}`);
      done++;
      if (done === crops.length) {
        console.log('\n🎉 精确切割完成！');
      }
    });
});

