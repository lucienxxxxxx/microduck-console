---
name: comic-console
description: >-
  Use when building, restyling, or extending the microduck comic console UI:
  thick ink borders, hard offset shadows, huge display type, a yellow scrolling
  ticker, paper background, paint panels, sticker grids, or a centered 3D stage.
  Also use when the user mentions 改装台, 漫画风, 大粗字体, 黑边, 警示条, or neo-brutalist console chrome.
---

# Comic Console

改装台的界面只有这一套。新屏幕从参考组件拼出来，不另写颜色、圆角和阴影。

三层都来自现成体系，不要自造第四套：

| 层 | 成熟来源 | 在这里怎么用 |
| --- | --- | --- |
| 令牌 | W3C Design Tokens 的 primitive 层 | 颜色、字体、边、阴影只写在 [tokens.css](tokens.css) |
| 零件 | shadcn/ui：一个职责、用 class 表示变体 | 标记和样式在 [components.css](components.css)，标本在 [gallery.html](gallery.html) |
| 外观 | Neo-brutalism（neobrutalism.dev） | 实线黑边、无模糊硬阴影、高对比、胶囊按钮 |

## 拼一页

固定四行，顺序不能换：

1. `cc-top`：品牌、一行等宽眉题、右侧事实胶囊
2. `cc-ticker`：黄底、上下 4px 黑边、轻微倾斜。文案写两遍，才能无缝滚动
3. `cc-workspace`：左控制面板、中舞台、右控制面板
4. `cc-footer`：等宽小字，只放许可和来源

窄于 980px 时改成一列，舞台高度 70vh。

## 组件

| 要放的东西 | class | 选中 |
| --- | --- | --- |
| 品牌字 | `cc-brand` | 无 |
| 眉题 | `cc-eyebrow` | 青点只表示“活着” |
| 事实胶囊 | `cc-chip` | 无 |
| 滚动条 | `cc-ticker` | 无 |
| 白底控制板 | `cc-panel` | 无 |
| 大标题 | `cc-display` | 第二块面板用 `accent` |
| 说明句 | `cc-lead` | 无 |
| 预设 / 材质 | `cc-pill` | `is-on` 变黄 |
| 色点 | `cc-swatch` | 无 |
| 零件色区 | `cc-zone` | `is-on` 变黄 |
| 整行主按钮 | `cc-block` | `is-on` 变黄，次要动作用 `ghost` |
| 黑底舞台 | `cc-stage` | 无 |
| 倾斜便条 | `cc-stage-note` | 无 |
| 加载 | `cc-load` | 完成后隐藏 |
| 贴纸缩略图 | `cc-tile` | `is-on` 变黄并倾斜 |
| 滑杆行 | `cc-slider` | 无 |
| 已贴清单 | `cc-placed` | 无 |

色区是 `div`，颜色输入放在里面。不要把 `input` 套进 `button`。

打开 [gallery.html](gallery.html) 对照标本。抄标记时连 class 一起抄，再把文案换成这一屏的话。

## 交互

- 没开贴纸模式时，点模型是在选色区，对应的 `cc-zone` 加上 `is-on`。
- 开了贴纸模式时，点模型只把贴纸贴到被点中的那一块上。
- 预设一次改完全部色区。材质（哑光、丝绸、金属）改光泽，不改色。
- 主按钮负责导出、截图、进入贴纸模式。撕掉是 `ghost`。

## 文案

标题用展示体，短，可以带句号，例如「上色。」「贴纸。」。说明用正文，一两句。眉题、状态、页脚用等宽。英文口号保持大写，例如 QUACK、WADDLE。

## 不要做

- 模糊阴影、玻璃拟态、新的渐变
- 令牌以外的颜色
- 第二套按钮或第二套圆角
- 把舞台改成白底，或把面板改成黑底
- 为了一块新信息再发明一个组件；先从上面的表里选
