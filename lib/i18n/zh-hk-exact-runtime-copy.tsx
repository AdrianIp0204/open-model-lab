"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import type { AppLocale } from "@/i18n/routing";

const exactRuntimeCopy = {
  ", and the light bridge reads": "，光橋上寫著",
  ", and the vertical component is": "，垂直分量是",
  ", and then": "， 進而",
  ", so from rest use": "，所以從休息使用",
  ", so it is approaching the coil.": "，所以它正在接近線圈。",
  ", so one full source cycle launches one more wavelength every 0.67 seconds.": "，因此一個完整的光源週期每 0.67 秒再發射一個波長。",
  ", so the 2 -> 1 line sits near 652.55 nm.": "，因此 2 -> 1 線位於 652.55 nm 附近。",
  ", so the angular acceleration is": "，所以角加速度為",
  ", so the current contrast is": "，所以當前對比度為",
  ", so the current rotation is at": "，所以目前轉角是",
  ", so the current state gives": "，所以目前狀態得到",
  ", so the current threshold is": "，所以當前閾值是",
  ", so the electric arrow points near zero.": "，因此電動箭頭指向接近零的位置。",
  ", so the inward field magnitude is": "，所以向內場的大小是",
  ", so the live bench says no emission occurs.": "，因此現場工作台表示沒有發生排放。",
  ", so the loop current is": "，所以環路電流為",
  ", so the magnetic marker points near zero.": "，因此磁性標記點接近零。",
  ", so the net electric flux is outward.": "，因此淨電通量是向外的。",
  ", so the particles are balanced rather than spread far apart.": "，因此粒子是平衡的而不是分散得很遠。",
  ", so the path curves clockwise.": "，所以路徑順時針彎曲。",
  ", so the probe sits 1.5 cycles behind the source.": "，因此探頭位於來源後方 1.5 個週期。",
  ", so the same force is currently being spread across a moderate piston area.": "，因此相同的力目前分佈在中等活塞區域。",
  ", so the source is positive.": "，所以源為正。",
  ", so the throat is 2 times as fast as section A.": "，所以喉嚨的速度是A段的2倍。",
  ", so the total energy transfer is 0\\,\\mathrm{kJ}": "，因此總能量轉移為 0\\,\\mathrm{kJ}",
  ", so the total internal energy is": "，所以總內能是",
  ", so the total moment of inertia is": "，所以總轉動慣量為",
  ", so the total stays": "，所以總的停留時間為",
  ", the actual source frequency is 558.24 THz.": "，實際源頻率為 558.24 THz。",
  ", the bounded field model gives": "，有界場模型給出",
  ", the bracket becomes": "，括號變為",
  ", the center-of-mass acceleration becomes": "，質心加速度變成",
  ", the coil links": "，線圈鏈結",
  ", the current state gives": "，當前狀態給出",
  ", the first column is its image, so": "，第一列是它的圖像，所以",
  ", the fixed half-perimeter is": "，固定半週長為",
  ", the matching height is": "，匹配高度為",
  ", the perpendicular part is": "，垂直部分是",
  ", the photon energy is": "，光子能量是",
  ", the predicted range becomes": "，預測範圍變為",
  ", the ring contribution is": "，環貢獻為",
  ", the same probe has": "，同一個探頭有",
  ", the second column is its image, so": "，第二列是它的圖像，所以",
  ", the total mass is": "，總質量為",
  ", this jump gives 656.39 nm in the 可見光.": "，此跳躍給出了 656.39 nm 的可見光。",
  ", while the circular-speed comparison is": "，而圓週速度比較是",
  ", with a total drop of": "，總共下降了",
  ", with all integer harmonics for this boundary.": "，具有該邊界的所有整數諧波。",
  ", with the hydrostatic contribution currently larger.": "，目前靜水壓的貢獻較大。",
  ": R1 in series with a": "：R1串聯一個",
  ": terminal voltage": "：端電壓",
  ". Because the middle area is smaller, the same flow rate must move faster there.": "。由於中間區域較小，因此相同的流速必須在那裡移動得更快。",
  ". Most of the throat pressure drop here is being spent on extra speed through the narrower throat.": "。這裡的大部分喉部壓降都被消耗在通過較窄喉部的額外速度。",
  ". On this bench the rotational inertia stays fixed at": "。在此工作台上，轉動慣量保持固定為",
  ". That gives a travel time of": "。這給出了旅行時間",
  ". The total supported weight is then": "。那麼總支撐重量為",
  "\\(N_{\\mathrm{exp}} \\approx 1\\) nuclei at \\(t = 0 s\\)": "\\(N_{\\mathrm{exp}} \\approx 1\\) 個原子核位於 \\(t = 0 s\\)",
  "$, which is why the pressure gauge is reading a steady value.": "$，這就是壓力表讀數穩定的原因。",
  "0 V shared group return": "0 V 共享組返回",
  "0.07 arb. (no light cue)": "0.07 任意值。 （無燈光提示）",
  "0.6 nm path window": "0.6 nm 路徑視窗",
  "1. Group the highlighted pair:": "1. 將突出顯示的對分組：",
  "2. Add R1 in series: R_eq = R1 + R_group": "2.串聯添加R1：R_eq = R1 + R_group",
  "6 V shared group start": "6 V 共享組啟動",
  "A can support 8 / 2 = 4 full batches, while B can support 15 / 3 = 5.": "A 可以支援 8 / 2 = 4 個完整批次，而 B 可以支援 15 / 3 = 5 個。",
  "A changing magnetic flux does not just change a number on a graph. It creates a circulating electric field whose direction flips when the magnetic change flips.": "變化的磁通量不僅會改變圖表上的數字。它會產生一個循環電場，當磁力變化翻轉時，其方向也會翻轉。",
  "A circular period is circumference divided by circular speed, so": "圓週週期是周長除以圓週速度，所以",
  "A critical angle only exists when light starts in the higher-index medium, so first compare": "僅當光在折射率較高的介質中啟動時才存在臨界角，因此首先比較",
  "A dot B = 15.75. The angle between the vectors is about 19.25 deg, and the scalar projection of B onto A is 3.69. B still points partly along A, so the projection lands in A's direction.": "A 點 B = 15.75。向量之間的角度約為 19.25 度，B 到 A 上的標量投影為 3.69。 B 仍部分指向 A，因此投影落在 A 的方向。",
  "A limits because it supports fewer full recipe batches than B.": "A 有限制，因為它支援的完整配方批次比 B 少。",
  "A limits; 3 B packets remain.": "A 限制；剩餘 3 個 B 資料包。",
  "A node belongs in the frontier after it has been discovered from an edge, but before the search has checked all of its own neighbors.": "在從邊緣發現節點之後、但在搜尋檢查完所有鄰居之前，節點屬於邊界。",
  "A node belongs in visited only after its neighborhood has been used, so future edges back to it should not create new frontier work.": "節點僅在其鄰域使用後才屬於已存取節點，因此返回到該節點的未來邊緣不應建立新的前沿工作。",
  "A positive image distance means the reflected rays really cross in front of the mirror, so the image can be caught on a screen.": "正像距意味著反射光線真正穿過鏡子前面，因此可以在螢幕上捕捉影像。",
  "Accumulation graph": "累積圖",
  "acid": "酸",
  "Active graph": "活動圖",
  "active line mapping": "活動線路映射",
  "active pair": "活躍對",
  "actual": "實際的",
  "Actual fraction": "實際分數",
  "Actual output = 4.5 batches; yield gap = 1.5 batches.": "實際產量=4.5批次；產量差距 = 1.5 批次。",
  "actual remaining": "實際剩餘",
  "actual vs expected": "實際與預期",
  "Adding the three visible pathways gives a total transfer rate of": "加入三個可見路徑所得的總傳輸速率為",
  "Addition is being shown tip-to-tail, so the resultant runs from the origin to the final endpoint after sA and B are combined.": "加法是從頭到尾顯示的，因此在 sA 和 B 組合後，所得結果從原點運行到最終端點。",
  "Adjacency is the local structure that every later search rule has to respect.": "鄰接是每個後續搜尋規則都必須遵守的局部結構。",
  "advantage": "優勢",
  "After A claims B and C, both nodes sit on the frontier, but the newest claim C is now on top.": "在 A 聲明 B 和 C 後，兩個節點都位於邊界上，但最新的聲明 C 現在位於頂部。",
  "After the first expansion, the claimed next-step frontier is [B, C] rather than the whole graph.": "第一次擴展後，聲稱的下一步前沿是[B，C]而不是整個圖。",
  "After the full-yield run, 3 packets of B remain while A is fully used.": "滿產運作後，B 剩餘 3 包，而 A 已完全使用。",
  "ahead": "前面",
  "algorithm": "演算法",
  "alpha": "阿爾法",
  "already expanded": "已經擴大了",
  "amount": "數量",
  "Ampere-Maxwell": "安培-麥克斯韋",
  "Ampere-Maxwell is currently": "安培-麥克斯韋目前",
  "An open-open tube lets both ends breathe as displacement antinodes, so the fundamental is a half-wave fit across the full length.": "開放式管讓兩端作為位移波腹呼吸，因此基本原理是在整個長度上進行半波擬合。",
  "and a wall collision rate of 82.48\\,\\mathrm{hits/s}": "牆壁碰撞率為 82.48\\,\\mathrm{hits/s}",
  "and the moving mass is": "移動質量是",
  "and the vertical projection gives": "垂直投影給出",
  "and then": "進而",
  "Angle at t": "t 處的角度",
  "Angular momentum": "角動量",
  "Angular momentum bench": "角動量台",
  "Angular speed": "角速度",
  "arctan(1.73) returns about 60 deg, which already matches the actual first-quadrant angle.": "arctan(1.73) 回傳約 60 度，這已經與實際的第一象限角度相符。",
  "area": "區域",
  "Ares": "阿瑞斯",
  "arrivals every": "到達時間間隔",
  "As the same mass moves outward, the moment of inertia rises and the same angular momentum would require less angular speed.": "當相同的質量向外移動時，慣性矩增加，相同的角動量需要較小的角速度。",
  "Asymptotes": "漸近線",
  "At 550 nm, the current green ray uses n(lambda) = 1.52, so the thin-prism bend is larger than red but smaller than violet in the same material.": "在 550 nm 處，目前綠光使用 n(lambda) = 1.52，因此在相同材料中，薄棱鏡彎曲比紅光大，但比紫光小。",
  "At 75% yield, the actual tray reaches 4.5 product batches.": "成品率75%時，實際托盤達4.5個產品批次。",
  "At about 53.1 deg, the unit-circle point is close to (0.60, 0.80), so cos theta is about 0.60 and sin theta is about 0.80.": "在大約 53.1 度處，單位圓點接近 (0.60, 0.80)，因此 cos theta 約為 0.60，sin theta 約為 0.80。",
  "At escape threshold,": "在逃生門檻處，",
  "At r = 4 and theta = 60 deg, the point sits near (2.00, 3.46).": "當 r = 4 且 theta = 60 度時，點位於 (2.00, 3.46) 附近。",
  "At t = 0 s, the bench shows about 14 reactant units and 4 product units.": "在 t = 0 s 時，實驗台顯示約 14 個反應物單位和 4 個生成物單位。",
  "At t = 0 s, the particle is at 0.3 rad with x = 1.15 m and y = 0.35 m. Its tangential speed stays 1.68 m/s while the centripetal acceleration of 2.35 m/s² points inward.": "在 t = 0 s 時，粒子處於 0.3 rad，x = 1.15 m，y = 0.35 m。其切向速度保持為 1.68 m/s，而向內加速度為 2.35 m/s²。",
  "At t = 0 s, the unit-circle point sits in Quadrant I at theta = 10.31°. The horizontal projection is cos(theta) = 0.98, the vertical projection is sin(theta) = 0.18, and one full turn takes 6.28 s.": "在 t = 0 s 時，單位圓點位於象限 I 的 theta = 10.31° 處。水平投影為 cos(theta) = 0.98，垂直投影為 sin(theta) = 0.18，一整圈需要 6.28 s。",
  "At t = 0 s, the unit-circle point sits in Quadrant I at theta = 53.29°. The horizontal projection is cos(theta) = 0.6, the vertical projection is sin(theta) = 0.8, and one full turn takes 6.28 s.": "在 t = 0 s 時，單位圓點位於象限 I 的 theta = 53.29° 處。水平投影為 cos(theta) = 0.6，垂直投影為 sin(theta) = 0.8，一整​​圈需要 6.28 s。",
  "At t = 0.02 s, the probe is at y = 0 m with edge-to-edge path difference 0 m. The current lambda/a ratio is 0.42, so the probe field has envelope 1 and relative intensity 1. The first minimum sits near 25.06°.": "在 t = 0.02 s 時，探頭位於 y = 0 m，邊到邊路徑差為 0 m。当前 lambda/a 比率为 0.42，因此探测场的包络线为 1，相对强度为 1。第一个最小值位于 25.06° 附近。",
  "At t = 0.02 s, the unit-circle point sits in Quadrant I at theta = 11.27°. The horizontal projection is cos(theta) = 0.98, the vertical projection is sin(theta) = 0.2, and one full turn takes 6.28 s.": "在 t = 0.02 s 時，單位圓點位於第一象限 θ = 11.27°。水平投影為 cos(theta) = 0.98，垂直投影為 sin(theta) = 0.2，一整圈需要 6.28 s。",
  "At t = 0.05 s, the particle is at 0.36 rad with x = 1.12 m and y = 0.43 m. Its tangential speed stays 1.68 m/s while the centripetal acceleration of 2.35 m/s² points inward.": "在 t = 0.05 s 時，粒子處於 0.36 rad，其中 x = 1.12 m，y = 0.43 m。其切向速度保持為 1.68 m/s，而向內加速度為 2.35 m/s²。",
  "At t = 0.07, the point is near (3.19, 0.33). The path spans about 6.4 units wide and 4.8 units tall. The point is moving at a moderate speed through the traced path.": "在 t = 0.07 時，該點接近 (3.19, 0.33)。路徑寬約 6.4 個單位，高約 4.8 個單位。該點正在以中等速度穿過所描繪的路徑移動。",
  "At t = 0.08 s, the probe is at y = 0 m with edge-to-edge path difference 0 m. The current lambda/a ratio is 0.42, so the probe field has envelope 1 and relative intensity 1. The first minimum sits near 25.06°.": "在 t = 0.08 s 時，探頭位於 y = 0 m，邊到邊路徑差為 0 m。目前 lambda/a 比率為 0.42，因此探測場的包絡線為 1，相對強度為 1。第一個最小值位於 25.06° 附近。",
  "At that same x-value, the accumulation graph shows A(x) = 1.01.": "在同一 x 值處，累積圖顯示 A(x) = 1.01。",
  "At the current temperature and concentration, the box makes about 32.73 collision attempts each second.": "在目前溫度和濃度下，盒子每秒進行約 32.73 次碰撞嘗試。",
  "at the probe.": "在探頭處。",
  "At the same instant the stage still gives": "同時，舞台仍然給予",
  "at the same radius.": "在同一半徑處。",
  "At the split node, the total current is being conserved by becoming the two branch currents. The larger-resistance branch keeps the smaller current.": "在分離節點，總電流通過成為兩個支路電流而守恆。電阻較大的支路保持較小的電流。",
  "At this moment, x(t) = 3.2 and y(t) = 0.": "此時，x(t) = 3.2，y(t) = 0。",
  "At x = 0, the point on the curve is y = 0 and the tangent slope is -1. The tangent falls from left to right here. With delta x = 0.8, the secant slope is -0.88.": "當 x = 0 時，曲線上的點為 y = 0，切線斜率為 -1。此處切線由左向右下降。當 delta x = 0.8 時，正割斜率為 -0.88。",
  "Average particle motion sets temperature. Total particle count and bond store set how much internal energy that same temperature represents.": "平均粒子運動決定溫度。總粒子數和鍵存儲決定了相同溫度代表多少內能。",
  "average slope": "平均坡度",
  "B along display window": "B 沿著顯示窗",
  "B at probe (display)": "探測點 B（顯示）",
  "B at probe (x3 display)": "探測點 B（x3 顯示）",
  "B curve drawn x": "B 繪製 x 曲線",
  "B still keeps an along-A part in A's direction.": "B 仍保留 A 方向上的沿 A 部分。",
  "Balance": "平衡",
  "band": "樂團",
  "Band: Visible light, lambda_0 = 537.03 nm, f = 558.24 THz": "波段：可見光，lambda_0 = 537.03 nm，f = 558.24 THz",
  "base": "根據",
  "Base curve": "基曲線",
  "Base vertex": "基礎頂點",
  "Because": "因為",
  "Because \\(\\ln 4 = 2 \\ln 2\\), this target sits at exactly two doubling times, so the hit marker should land a little past 5.5 time units.": "因為 \\(\\ln 4 = 2 \\ln 2\\)，該目標恰好位於兩倍倍的時間，因此命中標記應該落在略高於 5.5 時間單位的位置。",
  "Because 4 batches is the smaller cap, A is the limiting reagent.": "由於 4 批次是較小的上限，因此 A 是限制試劑。",
  "Because A'(x) = f(x), the accumulation graph has local slope 0.52 at this point.": "因為 A'(x) = f(x)，累積圖此時的局部斜率為 0.52。",
  "Because BFS uses a queue frontier, B should leave the frontier before the later discovery C.": "由於 BFS 使用隊列邊界，因此 B 應該在後來發現 C 之前離開隊列。",
  "Because DFS uses a stack frontier, C leaves next even though B was discovered first.": "由於 DFS 使用堆疊邊界，因此即使先發現 B，C 也會接著離開。",
  "Because the charge is positive, the actual bend follows the standard right-hand-rule direction for the live launch arrow and field sense.": "由於電荷為正，因此實際彎曲遵循即時發射箭頭和場感的標準右手定則方向。",
  "Because the middle area is smaller, the same flow rate must move faster there.": "由於中間區域較小，因此相同的流速必須在那裡移動得更快。",
  "Because the target is larger than the midpoint value, the left half is already ruled out.": "由於目標值大於中點值，因此左半部已被排除。",
  "because this bench keeps": "因為這張長椅保留了",
  "Before contact, the system total is already fixed by the incoming masses and velocities, so the collision has not created a new total.": "在接觸之前，系統總計已經由傳入的質量和速度固定，因此碰撞並未創建新的總計。",
  "Bernoulli state": "伯努利狀態",
  "best": "最好的",
  "best square": "最佳廣場",
  "Blocked I/I0": "阻塞 I/I0",
  "blue edge": "藍邊",
  "bond": "紐帶",
  "bounded no-slip model with one incline and one rigid roller": "具有一個斜面和一個剛性滾輪的有界防滑模型",
  "Breadth-first and depth-first search will organize that frontier differently, but they still start from the same local adjacency picture.": "廣度優先和深度優先搜尋將以不同的方式組織該邊界，但它們仍然從相同的局部鄰接圖開始。",
  "Bridge cycle": "橋循環",
  "bright": "明亮的",
  "Bubble": "氣泡",
  "Bubble on shuffled input": "打亂輸入時出現氣泡",
  "Bubble sort is running on a shuffled list of 9 values. Comparisons: 0. Writes: 0. The active stage is \"bubble sort ready\". The largest unsorted value will keep drifting toward the right edge.": "冒泡排序在 9 個值的打亂清單上運行。比較：0。寫入：0。活動階段是「冒泡排序就緒」。最大的未排序值將不斷向右邊緣漂移。",
  "buffer": "緩衝",
  "buffer bench": "緩衝台",
  "Buffer reserve": "緩衝儲備",
  "Capacitor state": "電容狀態",
  "Capacitor voltage Vc": "電容器電壓Vc",
  "capacity": "容量",
  "case": "案件",
  "center": "中心",
  "centripetal accel.": "向心加速度",
  "changes count, not KE": "更改計數，而不是 KE",
  "Changing B makes circulating E": "改變B使得E循環",
  "Changing force or duration changes how much momentum the cart gains or loses.": "改變力道或持續時間會改變小車獲得或失去的動量。",
  "Charge makes electric flux": "電荷產生電通量",
  "charging": "收費",
  "charging toward the source": "向源頭充電",
  "checks": "檢查",
  "Circuit state": "電路狀態",
  "claimed but waiting": "已領取但正在等待",
  "cleaner fit": "更乾淨的貼合",
  "clockwise": "順時針",
  "close to n = 1": "接近 n = 1",
  "closed loops": "閉環",
  "collector": "集電極",
  "collector voltage": "集極電壓",
  "color-dependent index": "顏色相關指數",
  "compact reference": "緊湊參考",
  "Compare mode keeps the same scale.": "比較模式保持相同的比例。",
  "Compare the two source terms: conduction current and changing electric flux. Both land on one shared B loop.": "比較兩個源項：傳導電流和變化的電通量。兩者都落在一個共享的 B 環路上。",
  "comparisons": "比較",
  "conc": "濃度",
  "concave": "凹",
  "Concave mirror": "凹面鏡",
  "Concentration": "專注",
  "cond": "條件",
  "conduction": "傳導",
  "Conduction": "傳導",
  "Conduction is dominant here because the material-contact path is strong while the room stays cooler than the block.": "傳導在這敵占主導地位，因為材料接觸路徑很強，同時房間比物體保持涼爽。",
  "continuity": "連續性",
  "Continuity fixes where the flow speeds up. Bernoulli keeps the total budget tied to speed, height, and static pressure in the same bounded stream.": "連續性修復了流動加速的地方。伯努利將總預算與同一有界流中的速度、高度和靜壓連結起來。",
  "continuity-equation": "連續性方程",
  "continuous": "連續的",
  "Continuous": "連續的",
  "Continuum reference": "連續體參考",
  "conv": "轉換次數",
  "Convection": "對流",
  "cosine stays on x, sine stays on y": "餘弦留在 x 上，正弦留在 y 上",
  "costs another": "花費另一個",
  "crests move right": "波峰向右移動",
  "Critical angle": "臨界角",
  "Current and changing E make circulating B": "當前和變化的E使B循環",
  "Current curve": "電流曲線",
  "current dominated": "電流為主",
  "Current family": "現在的家庭",
  "Current growth": "目前的成長",
  "current rectangle": "目前矩形",
  "Current segment": "目前段",
  "current setup": "目前設定",
  "Current setups stay within about ±3.41 m on the fixed ±9 m track.": "目前設定在固定 ±9 m 軌道上保持在約 ±3.41 m 範圍內。",
  "Current target hit": "目前目標命中",
  "Current transform": "電流變換",
  "Curve": "曲線",
  "cycle rate": "循環率",
  "cycles": "週期",
  "degC": "°C",
  "degC, latent share =": "攝氏度，潛在份額 =",
  "delta delta ~=": "德爾塔 德爾塔 ~=",
  "DeltaE": "德爾塔E",
  "density": "密度",
  "Depth is setting most of the pressure here": "深度決定了這裡的大部分壓力",
  "DFS keeps following that newest branch until it runs out of new neighbors, then it backtracks to older waiting nodes like B.": "DFS 繼續追蹤最新的分支，直到耗盡新的鄰居，然後回溯到較舊的等待節點，例如 B。",
  "Direct neutralization has already handled about 4.6 units, so the remaining push has to be absorbed by the buffer or show up on the pH strip.": "直接中和已處理約 4.6 個單位，因此剩餘的推力必須被緩衝液吸收或顯示在 pH 試紙上。",
  "discrete energy levels": "離散能階",
  "disorder left": "留下混亂",
  "dispersion-refractive-index-color": "色散折射率顏色",
  "displacement": "位移",
  "display sketch keeps wavelength order readable while the spectrum rail above keeps the real band scale": "顯示草圖保持波長順序可讀，而上面的光譜軌保持實際波段比例",
  "doubling amount": "加倍金額",
  "Doubling time": "倍增時間",
  "Drag the point or use the phase slider": "拖曳點或使用相位滑桿",
  "Drag the target line or use the sliders": "拖曳目標線或使用滑桿",
  "drag v0": "拖曳v0",
  "drag-and-terminal-velocity": "拖曳和終端速度",
  "drive ratio": "傳動比",
  "E along display window": "E 沿著顯示窗",
  "E at probe": "探測點 E",
  "E x B points right": "E x B 指向右側",
  "electromagnetic spectrum": "電磁波譜",
  "Emission": "排放",
  "Emission mode": "發射模式",
  "Emission spectrum": "發射光譜",
  "Enclosed charge sets the net electric flux through a closed surface. Positive charge sends the field outward; negative charge pulls it inward.": "封閉電荷設置通過封閉表面的淨電通量。正電荷將電場向外發送；負電荷將其向內拉。",
  "energy budget": "能源預算",
  "Energy change split": "能量變化分裂",
  "Energy delivered": "能量傳遞",
  "energy flows only if a temperature gap exists": "只有當有溫度差距時能量才會流動",
  "energy split": "能量分裂",
  "envelope": "信封",
  "Envelope": "信封",
  "even though the local closed-loop strength is": "即使局部閉環強度是",
  "expected": "預期的",
  "Expected fraction": "預期分數",
  "expected remaining": "預計剩餘",
  "Fall state": "跌倒狀態",
  "Far from the asymptote, the reciprocal part fades and the graph settles toward y = -1, so that is the horizontal asymptote.": "遠離漸近線，倒數部分逐漸減弱，圖形趨於 y = -1，這就是水平漸近線。",
  "Faraday": "法拉第",
  "Faraday and Ampere-Maxwell are the handoff pair. If changing E and changing B are both present in the same story, the field update can keep propagating instead of dying locally.": "法拉第和安培-麥克斯韋是切換對。如果改變 E 和改變 B 都出現在同一個故事中，那麼現場更新可以繼續傳播，而不是在本地消亡。",
  "Faraday's law gives": "法拉第定律給出",
  "Farther from the source, the potential has risen closer to zero, but it stays negative because zero is defined at infinity in this model.": "距離源較遠，位能已上升到接近零，但仍為負值，因為在此模型中零被定義為無窮大。",
  "field between plates": "板間場",
  "field lines close": "場線閉合",
  "finish gate": "終點門",
  "Finite limit": "有限極限",
  "fixed at": "固定在",
  "fixed Bohr-like loop": "固定玻爾環",
  "Fixed perimeter: 24 m": "固定週長：24 m",
  "flow": "流動",
  "Flow state": "流動狀態",
  "Fluid bench": "流體工作台",
  "For 550 nm, the bounded thin-prism model gives n(lambda) = 1.52 and a prism deviation of about 9.36°. Shorter visible wavelengths bend more strongly here, so violet leaves about 0.28° below red across the same prism.": "對於 550 nm，有界薄棱鏡模型給出 n(lambda) = 1.52 和約 9.36° 的棱鏡偏差。較短的可見光波長在這裡彎曲得更厲害，因此在同一棱鏡上，紫羅蘭色比紅色低約 0.28°。",
  "for a circular aperture.": "對於圓形光圈。",
  "For equal launch and landing height, use": "為了獲得相同的發射和著陸高度，請使用",
  "for readability": "為了可讀性",
  "for that same reference circle.": "對於相同的參考圓。",
  "For the circular case, the same gravity-turning balance gives": "對於圓形錶殼，同樣的重力轉動擺輪給出",
  "for the current controls.": "對於目前的控制項。",
  "For the current ladder,": "對於目前的天梯來說，",
  "for the current shape or custom mass distribution.": "對於目前形狀或自訂品質分佈。",
  "For the current 兩端開口的管, use": "對於當前屋頂開口的管，使用",
  "for the same instant shown on the stage.": "舞台上顯示的同一瞬間。",
  "for the same instant.": "在同一瞬間。",
  "For this bench,": "對於這張長凳，",
  "For this bounded incline use": "對於這個有限的傾斜使用",
  "For this bounded model,": "對於這個有界模型，",
  "For this bounded rotor use": "對這個有界轉子使用",
  "For this sample,": "對於這個樣本，",
  "Forward": "正向",
  "Forward change is still winning, so the mixture is moving toward more products.": "向前的變革仍然是勝利者，因此混合物正在轉向更多的產品。",
  "found": "成立",
  "frequency": "頻率",
  "from": "從",
  "From A, BFS settles the B/C layer before it pushes deeper.": "從 A 開始，BFS 在進一步推進之前先解決 B/C 層。",
  "From A, DFS puts C on top of the stack frontier and dives there next.": "從 A 開始，DFS 將 C 放在堆疊邊界的頂部，然後向下潛入那裡。",
  "From A, the first frontier is B and C.": "從 A 開始，第一個邊界是 B 和 C。",
  "from Source A and": "來自來源 A，並且",
  "from Source B.": "來自來源 B。",
  "From the graph, the left-hand sample is about 0.85 and the right-hand sample is about 1.35.": "從圖中可以看出，左側樣本約為0.85，右側樣本約1.35。",
  "From the left": "從左邊開始",
  "From the live snapshot, the probe electric field is": "從即時快照來看，探針電場為",
  "From the origin to the probe,": "從起源到探索，",
  "From the right": "從右邊",
  "front lambda": "前λ",
  "Front spacing": "前間距",
  "Frontier = discovered and waiting; visited = expanded and safe to skip when seen again.": "前沿=發現並等待；訪問過 = 已展開，再次看到時可以安全跳過。",
  "full batches": "整批",
  "fundamental": "基本的",
  "fundamental resonance": "基本共振",
  "Gamma": "伽瑪",
  "Gas state": "氣態",
  "Gauss for B": "B 的高斯",
  "Gauss for E": "E 的高斯",
  "Gauss-B stays at zero net flux while closed loops strengthen to": "Gauss-B 保持在零淨通量，同時閉環增強至",
  "Graph transformations": "圖轉換",
  "green": "綠色的",
  "green visible": "綠色可見",
  "group": "團體",
  "grouped pair": "分組對",
  "half-life checkpoints": "半衰期檢查點",
  "half-lives": "半衰期",
  "harmonic": "諧波",
  "Heat is energy transfer due to temperature difference. Contact shapes conduction, moving air shapes convection, and radiation keeps working without contact.": "熱是由於溫差而產生的能量傳遞。接觸形成傳導，移動空氣形成對流，輻射在不接觸的情況下保持工作。",
  "Heat-flow state": "熱流狀態",
  "heater": "加熱器",
  "Heating curves are honest only when the same energy bookkeeping drives temperature, phase fraction, graphs, compare mode, and challenge checks together.": "只有當相同的能量記帳同時驅動溫度、相分數、圖表、比較模式和挑戰檢查時，加熱曲線才是真實的。",
  "height": "高度",
  "Height": "高度",
  "Here the selected mode is the fundamental resonance and the fundamental, so": "這裡選擇的模式是基波諧振和基波，所以",
  "hf below phi: no emitted electrons": "hf 低於 phi：沒有發射電子",
  "high": "高的",
  "hits": "點擊數",
  "hole": "洞",
  "Horizontal asymptote": "水平漸近線",
  "hot block": "熱塊",
  "Hydrostatic gain": "靜水壓增益",
  "Iavail": "亞瓦伊爾",
  "Icol": "伊科爾",
  "Ideal-gas particle box": "理想氣體粒子箱",
  "ideal-gas-law-kinetic-theory": "理想氣體定律動力學理論",
  "ideal-source limit: V_term -> 12 V": "理想來源限制：V_term -> 12 V",
  "Ienc": "英克",
  "Impulse is signed area inside the pulse window.": "脈衝是脈衝視窗內的有符號區域。",
  "In Quadrant I the principal arctan output and the full polar angle agree, so the ratio recovery is direct.": "在像限 I 中，主反正切輸出和全極角一致，因此比率恢復是直接的。",
  "in the displayed": "在顯示的",
  "in the displayed units,": "在顯示的單位中，",
  "in the displayed units.": "以顯示的單位表示。",
  "in the height term.": "在高度方面。",
  "in the normalized live model.": "在標準化的即時模型中。",
  "in the spectrum": "在光譜中",
  "In this bounded model, the live settings give \\(p = mv = 2\\times10^{-24}\\,\\mathrm{kg\\,m/s}\\).": "在此有界模型中，即時設定給出 \\(p = mv = 2\\times10^{-24}\\,\\mathrm{kg\\,m/s}\\)。",
  "in this bounded setup.": "在這個有界設定中。",
  "In this model, the current temperature corresponds to an average kinetic energy of": "在此模型中，當前溫度對應的平均動能為",
  "incoming beam": "入射光束",
  "incoming wavefronts": "入射波前",
  "Infrared": "紅外線的",
  "inside itself, so": "在其自身內部，所以",
  "intensity": "強度",
  "Internal drop": "內部跌落",
  "internal drop = 1.71 V": "內部壓力降 = 1.71 V",
  "Internal energy split": "內部能量分裂",
  "interval": "間隔",
  "into the load": "進入負載",
  "is changing the phase state, so the live temperature change is 0\\,\\mathrm{degC}": "正在改變相態，因此即時溫度變化為 0\\,\\mathrm{degC}",
  "is still below the work function 2.3 eV, the beam remains below threshold and no electrons are emitted.": "仍低於功函數 2.3 eV，光束保持低於閾值且沒有電子發射。",
  "is the weight of the displaced fluid, which is why the displaced-fluid cue and the buoyant-force arrow stay synchronized.": "是排出液體的重量，這就是排出液體提示和浮力箭頭保持同步的原因。",
  "isolated interaction window": "隔離交互視窗",
  "Keep A 供應與可能批次 open and watch the live bench.": "保持供應與可能批量打開並觀看實時工作台。",
  "Keep 壓力與深度 open and watch the live bench.": "保持壓力與深度開放並觀看現場長凳。",
  "Keep 近漸近線響應 open and watch the live bench.": "保持近漸近線響應開啟並觀看即時工作台。",
  "Keep 速度與時間 open and watch the live bench.": "保持速度與時間開放並觀看現場替補席。",
  "Kinetic": "動力學",
  "Kinetic energy is larger here, so the mass is in the faster middle part of the swing rather than near an edge.": "這裡的動能較大，因此質量位於揮桿速度較快的中間部分，而不是邊緣附近。",
  "Kmax": "最大K值",
  "L(r) at current omega": "當前 omega 處的 L(r)",
  "lambda": "拉姆達",
  "lamp": "燈",
  "Larger m c means the same power changes temperature less each minute.": "m c 越大，表示相同的功率每分鐘改變的溫度越小。",
  "launch": "發射",
  "Layered campus": "分層校園",
  "left": "左邊",
  "Left of x = h": "x 的左邊 = h",
  "lens-imaging": "鏡頭成像",
  "Lifting the throat by": "抬起喉嚨",
  "light frequency": "光頻率",
  "limit": "限制",
  "Linear contrast": "線性對比度",
  "Linear input at 20°": "20° 線偏振輸入",
  "linear need": "線性需要",
  "liquid-like": "液體狀",
  "Live": "居住",
  "Live air column": "活氣柱",
  "Live beat bench": "現場節拍長凳",
  "Live coupled fields": "即時耦合場",
  "Live decay bench": "活腐長凳",
  "Live double slit": "直播雙縫",
  "Live interference": "現場幹擾",
  "Live isolated system": "即時隔離系統",
  "Live light field pair": "即時光場對",
  "Live line-spectrum bench": "即時線譜工作台",
  "Live matter-wave bench": "現場物質波長凳",
  "Live momentum bars": "即時動量條",
  "Live passing-source bench": "現場傳遞源工作台",
  "Live photoelectric bench": "現場光電工作台",
  "Live prism": "即時棱鏡",
  "Live prism green": "活棱鏡綠",
  "Live RC bench": "現場遙控長椅",
  "Live readout": "即時讀數",
  "Live search": "即時搜尋",
  "Live setup": "即時設定",
  "Live synthesis": "即時合成",
  "Live traveling wave": "現場行波",
  "Live: buffer reserve can hold the pH near the middle even while neutralization and chemical change are still happening.": "即時：即使中和和化學變化仍在發生，緩衝液儲備仍可將 pH 值保持在中間附近。",
  "Live: concentration means how much solute is spread through how much liquid.": "活：濃度是指有多少溶質擴散到多少液體中。",
  "Load drop = 12 V": "負載降 = 12V",
  "Loads look equally bright": "負載看起來同樣明亮",
  "local matter-wave spacing": "局部物質波間距",
  "Log view straightens the target question": "日誌視圖理順目標問題",
  "loop circumference L =": "環週長 L =",
  "loud pulse": "響亮的脈搏",
  "Lowering the cycle rate lengthens the handoff period to": "降低週期率會延長切換週期",
  "m, fixed inertia": "m，固定慣量",
  "Magnetic circulation is not sourced only by conduction current. Maxwell's displacement-current term means a changing electric field also feeds the same B circulation story.": "磁循環不僅由傳導電流產生。麥克斯韋的位移電流項意味著變化的電場也會產生相同的 B 環流故事。",
  "Magnetic field lines close on themselves. You can have stronger or weaker magnetic patterns locally, but the net magnetic flux through a closed surface stays zero.": "磁力線相互靠近。您可以在局部具有更強或更弱的磁性圖案，但透過閉合表面的淨磁通量保持為零。",
  "Magnetic flux still balances": "磁通量仍然平衡",
  "margin": "利潤",
  "margin to edge": "邊距到邊緣",
  "mass": "大量的",
  "Mass radius": "質量半徑",
  "Max KE": "最大KE",
  "medium axis": "中軸",
  "medium link": "中等連結",
  "medium position": "中間位置",
  "metal": "金屬",
  "Microwave": "微波",
  "Middle speed": "中速",
  "min gap": "最小間隙",
  "mirror": "鏡子",
  "Mixture": "混合物",
  "mode": "模式",
  "Mode changes bright peaks into dark notches.": "模式將明亮的峰值更改為黑暗的凹口。",
  "Moment of inertia": "轉動慣量",
  "Most of the same mass stays close to the axis here, so the rotor keeps a relatively small moment of inertia and responds quickly to the torque.": "大部分相同質量都保持在靠近軸的位置，因此轉子保持相對較小的轉動慣量，並對扭矩做出快速響應。",
  "Most of the throat pressure drop here is being spent on extra speed through the narrower throat.": "這裡的大部分喉部壓降都被消耗在通過較窄喉部的額外速度。",
  "Moving from section A to throat B shifts about": "從 A 段移動到喉嚨 B 的位置發生了變化",
  "moving point": "移動點",
  "mrad": "毫弧度",
  "Multiply by the amount of substance:": "乘以物質的量：",
  "Narrower throat, faster flow, lower static pressure": "喉部較窄，流速較快，靜壓較低",
  "near zero": "接近零",
  "Net electric flux": "淨電通量",
  "Net magnetic flux": "淨磁通量",
  "neutralized": "中和的",
  "no emitted electrons": "沒有發射電子",
  "no light cue": "無燈光提示",
  "Node A touches B and C directly, so those two nodes are the first adjacent candidates.": "節點 A 直接接觸 B 和 C，因此這兩個節點是第一個相鄰候選節點。",
  "Non-ideal source loop": "非理想源循環",
  "normal at the pole": "正常在極點",
  "not reinforcing": "不強化",
  "not yet": "還沒有",
  "nuclei": "原子核",
  "object": "目的",
  "Objective graph": "客觀圖",
  "observed spectrum": "觀測光譜",
  "observer": "觀察者",
  "observer still": "觀察者仍然",
  "of static pressure into the kinetic term.": "將靜壓轉化為動力學項。",
  "Off the axis the inward pull splits into horizontal and vertical components, but the net field still points directly toward the source mass.": "離開軸，向內的拉力分成水平和垂直分量，但淨場仍直接指向源質量。",
  "OH- character": "OH-字符",
  "OH- character: 4.64": "OH-性狀：4.64",
  "omega": "歐米茄",
  "On the live spectrum, the current gap set gives 3 visible lines between 459.2 nm and 652.55 nm.": "在即時光譜上，目前間隙設定在 459.2 nm 和 652.55 nm 之間提供 3 條可見線。",
  "One full batch spends 2 packets of A and 3 packets of B together.": "一個完整批次會同時消耗 2 包 A 和 3 包 B。",
  "One nucleus is still yes/no. The smooth curve is the sample expectation.": "一個核仍然是/否。平滑的曲線是樣本期望。",
  "One-by-one scanning reaches the target much more slowly": "一對一掃描到達目標的速度要慢得多",
  "Only about 37.46% of those collisions clear the effective barrier.": "其中只有約 37.46% 的碰撞能夠越過有效屏障。",
  "Only level gaps make lines, so nothing fills": "只有水平間隙才會形成線條，因此沒有任何東西被填充",
  "open end": "開放式結局",
  "open end: motion antinode, pressure node": "開放端：運動波腹、壓力波節",
  "open-open": "開-開",
  "Opposite-rate comparison": "相反比率比較",
  "Opposite-rate curve": "相反利率曲線",
  "out of page": "頁面外",
  "out of the page": "頁面外",
  "outward flux": "向外通量",
  "pair": "一對",
  "parallel": "平行線",
  "parcel shift": "包裹轉移",
  "parcel-motion nodes stay still while antinodes breathe most": "包裹運動節點保持靜止，而波腹呼吸最多",
  "Parent curve": "父親曲線",
  "Particle bench": "粒子台",
  "path diff": "路徑差異",
  "pattern": "圖案",
  "per particle.": "每個粒子。",
  "per volume": "每卷",
  "period": "時期",
  "phase": "階段",
  "phase diff": "相位差",
  "phase lag": "相位滯後",
  "Phase-change shelf": "相變架",
  "Phase-change temperature": "相變溫度",
  "Photon energy hf": "光子能量 hf",
  "pipe": "管道",
  "pitch": "瀝青",
  "plank": "板",
  "positive": "正",
  "Positive enclosed charge sets an outward net electric source term, while the magnetic-flux law still stays at zero because magnetic lines close back on themselves.": "正封閉電荷設定了向外的淨電源項，而磁通量定律仍然保持為零，因為磁力線自行閉合。",
  "Positive torque lifts the handle counterclockwise. Negative torque twists clockwise.": "正扭力逆時針抬起手柄。負扭矩順時針扭轉。",
  "Potential": "潛在的",
  "Power rate": "功率率",
  "Power split": "功率分配",
  "Pressure": "壓力",
  "pressure cue": "壓力提示",
  "pressure from particle speed and wall hits": "來自粒子速度和壁面撞擊的壓力",
  "Pressure gauge": "壓力計",
  "Pressure rises when the walls are hit more often, with greater particle momentum, or both.": "當牆壁受到更頻繁的撞擊、粒子動量更大或兩者兼而有之時，壓力就會上升。",
  "Pressure state": "壓力狀態",
  "preview window:": "預覽視窗：",
  "probe": "探測",
  "probe field": "探測場",
  "probe parcel": "探測包裹",
  "Probe point": "探測點",
  "Probe pressure": "探頭壓力",
  "propagates right": "向右傳播",
  "propagation axis": "傳播軸",
  "Pulling the same masses outward raises the rotational inertia smoothly, so the spin-up becomes progressively more sluggish.": "向外拉動相同的質量會平穩地提高旋轉慣性，因此旋轉會逐漸變得更緩慢。",
  "Pulse state": "脈衝狀態",
  "q+ matches the wire-force side.": "q+ 匹配線力側。",
  "Qenc": "昆茨",
  "QIII": "第三象限",
  "quantized spacing": "量化間距",
  "radial launch axis": "徑向發射軸",
  "Radiation": "輻射",
  "Radio": "收音機",
  "radius": "半徑",
  "reading": "閱讀",
  "Real branch": "真實分支",
  "real image": "真實影像",
  "rear lambda": "後λ",
  "Rear spacing": "後間距",
  "red edge": "紅邊",
  "Reduce this grouped pair first": "首先減少該分組對",
  "Reduced state": "還原狀態",
  "Reduction path": "減少路徑",
  "region": "地區",
  "relative displacement (a.u.)": "相對位移（a.u.）",
  "reserve": "預訂",
  "Resistive fall bench": "阻力跌倒凳",
  "Resistor drop Vr": "電阻壓降Vr",
  "response amplitude": "回應幅度",
  "result": "結果",
  "Resultant": "結果",
  "resultant and envelope": "結果和信封",
  "Reverse": "反向",
  "right": "正確的",
  "Right now 0\\,\\mathrm{kJ}": "現在 0\\,\\mathrm{kJ}",
  "Right now the live rates are": "現在的即時匯率是",
  "Right of x = h": "x = h 的右邊",
  "rightward pulse": "向右脈衝",
  "Rim speed": "輪緣速度",
  "Rolling state": "滾動狀態",
  "room and bench sink": "房間和長凳水槽",
  "sA + B gives result <4.5, 5>. The scalar keeps vector A at its original size before combination. The result points at about 48.01 degrees with magnitude 6.73.": "sA + B 給出結果<4.5, 5>。標量將向量 A 保持在組合之前的原始大小。結果約 48.01 度，震級為 6.73。",
  "same depth": "相同深度",
  "Same depth means the same fluid pressure. Deeper, denser, or stronger-gravity fluid gives a larger hydrostatic contribution.": "相同的深度意味著相同的流體壓力。更深、更密或更強的重力流體提供更大的靜水力貢獻。",
  "Same direction control, separate I slider": "同方向控制，獨立I滑塊",
  "same energy input can change T or phase fraction": "相同的能量輸入可以改變 T 或相分數",
  "same gaps, same wavelengths": "相同的間隙，相同的波長",
  "Same incompressible flow rate through each section means the fluid must speed up in a narrower region and slow down in a wider one.": "通過每個部分的相同不可壓縮流速意味著流體必須在較窄的區域中加速並在較寬的區域中減速。",
  "Same mass, adjustable radius, and live same-L reference": "相同質量、可調半徑和即時相同 L 參考",
  "Same mass, same slope, different shapes: the inertia factor is what changes how quickly the center speeds up.": "相同的質量，相同的斜率，不同的形狀：慣性因素改變了中心加速的速度。",
  "same P at this depth": "在此深度相同的 P",
  "same six equal masses, same total mass": "六個相等質量，總質量相同",
  "Same torque can still produce very different angular acceleration when the mass radius changes.": "當質量半徑變化時，相同的扭矩仍然可以產生截然不同的角加速度。",
  "sample": "樣本",
  "sample tray": "樣品盤",
  "screen": "螢幕",
  "secant": "割線",
  "Secant slope": "割線斜率",
  "series": "系列",
  "Series adds the two loads into one path, so the equivalent resistance rises and the same loop current must pass through both loads.": "串聯將兩個負載添加到一條路徑中，因此等效電阻上升，並且相同的環路電流必須通過兩個負載。",
  "Series resistances add directly, so each extra ohm raises the one-number load and reduces the same loop current everywhere.": "串聯電阻直接相加，因此每增加一個歐姆都會增加一個數位負載並減少各處相同的環路電流。",
  "Set gravity equal to the needed centripetal acceleration:": "將重力設定為等於所需的向心加速度：",
  "Setting y = 0 gives x = 3, and plugging in x = 0 gives y = -3, so the graph crosses at (3, 0) and (0, -3).": "設定 y = 0 得到 x = 3，代入 x = 0 得到 y = -3，因此圖形在 (3, 0) 和 (0, -3) 相交。",
  "Shifted reciprocal": "移位倒數",
  "shorter wavelength means larger n and larger bend": "較短的波長意味著較大的 n 和較大的彎曲",
  "shuffled": "洗牌的",
  "Shuffled": "洗牌",
  "side": "邊",
  "Sign map": "標誌圖",
  "Signed area": "簽名區",
  "single-phase warming": "單相升溫",
  "six equal masses, same total mass": "六個質量相等，總質量相同",
  "size": "尺寸",
  "Smaller middle area, larger middle speed": "中間面積較小，中間速度較大",
  "So A · B = |A| comp_A(B) = 4.27 × 3.69 = 15.75. The sign comes from alignment while the magnitude scales with how much vector A weights that projection.": "所以 A · B = |A| comp_A(B) = 4.27 × 3.69 = 15.75。符號來自對齊，而幅度則與向量 A 對該投影的權重成比例。",
  "So far binary search has used 0 midpoint checks, while a one-by-one scan would need 8 checks to guarantee the same target.": "到目前為止，二分搜尋使用了 0 次中點檢查，而一對一掃描需要 8 次檢查才能保證相同的目標。",
  "So far the trace has used 0 comparisons and 0 writes.": "到目前為止，追蹤已使用 0 次比較和 0 次寫入。",
  "So the circular-orbit speed is": "所以圓軌道速度為",
  "So the moving point is at (3.2, 0) on the traced curve.": "因此移動點位於追蹤曲線上的 (3.2, 0) 處。",
  "So the probe reads": "所以探針讀取",
  "So the rotating point is": "所以旋轉點是",
  "So the same point lands at": "所以同一點落在",
  "So the secant slope is": "所以割線斜率為",
  "So the throat pressure is": "所以喉部壓力為",
  "solid cylinder": "實心圓柱體",
  "solute": "溶質",
  "Solute": "溶質",
  "Solution bench": "解決方案台",
  "Solve \\(t_* = \\ln(T / y_0) / k\\), which gives \\(t_* = \\ln 4 / 0.25 \\approx 5.55\\).": "解 \\(t_* = \\ln(T / y_0) / k\\)，得到 \\(t_* = \\ln 4 / 0.25 \\approx 5.55\\)。",
  "source": "來源",
  "Source height": "源高度",
  "source mass": "來源品質",
  "source motion": "源運動",
  "source phases": "源相",
  "Source point": "來源點",
  "Source state": "來源狀態",
  "speed": "速度",
  "Speed": "速度",
  "Spin-up state": "自旋狀態",
  "spread": "傳播",
  "start": "開始",
  "Start with |A| = 4.27. That sets the scale for how much an along-A component will matter.": "以 |A| 開頭= 4.27。這決定了沿著 A 組件的重要性。",
  "Starting from A, the first neighbors B and C become the first queue frontier.": "從A開始，第一個鄰居B和C成為第一個佇列邊界。",
  "state": "狀態",
  "stationary": "固定式",
  "stays in series with the whole block,": "與整個區塊保持串聯，",
  "steady": "穩定的",
  "Steady Bernoulli bench": "穩定伯努利長凳",
  "Steady stream tube": "穩流管",
  "Stored charge Q": "儲存電荷Q",
  "Stored energy U": "儲能U",
  "submerged, so the displaced-fluid column is showing": "浸沒在水中，因此顯示出位移的流體柱",
  "support": "支援",
  "surface area = 1.2": "表面積 = 1.2",
  "Surface pressure": "表面壓力",
  "Symmetric placement gives": "對稱放置給出",
  "Synthesis reading": "綜合閱讀",
  "System state": "系統狀態",
  "tangent slope": "切線斜率",
  "Tangent slope": "切線斜率",
  "tangent speed": "切線速度",
  "target": "目標",
  "Target": "目標",
  "Target 25 in 14 ordered values": "14 個有序值中的目標 25",
  "Temperature": "溫度",
  "Terminal speed": "終端速度",
  "Terminal speed is where drag catches the weight, so": "終端速度是阻力捕獲重量的地方，所以",
  "Terminal speed is where the drag arrow grows to match weight.": "終端速度是拖曳箭頭增長以匹配重量的地方。",
  "Terminal voltage": "端電壓",
  "That allowed hydrogen gap is 1.89 eV on the live ladder and readout card.": "即時梯子和讀出卡上允許的氫間隙為 1.89 eV。",
  "That gives": "這給了",
  "That gives a concentration of about 11, with roughly 40 visible particles in the beaker.": "這樣得到的濃度約為 11，燒杯中大約有 40 個可見顆粒。",
  "That gives acid character 6.5 and base character 2.5.": "這給出了酸字符 6.5 和鹼字符 2.5。",
  "That gives cos^2 theta \\approx 0.36 and sin^2 theta \\approx 0.64.": "這給了 cos^2 theta 約 0.36 和 sin^2 theta 約 0.64。",
  "That gives result = <3 + 1.5, 2 + 3> = <4.5, 5>.": "結果 = <3 + 1.5, 2 + 3> = <4.5, 5>。",
  "That gives z + w = 3.3 + 3.4i, so the sum lands at (3.3, 3.4).": "得出 z + w =​​ 3.3 + 3.4i，因此總和為 (3.3, 3.4)。",
  "That leaves": "那留下",
  "That leaves a rate gap of about 2.42, which tells you how far the mixture still is from a balanced exchange.": "這留下了大約 2.42 的匯率差距，這可以告訴您混合物距離平衡交換還有多遠。",
  "That leaves about 12.26 successful collisions each second and about 20.47 unsuccessful ones.": "這樣一來，每秒大約有 12.26 次成功碰撞，以及大約 20.47 次不成功碰撞。",
  "That means the bench can finish 5 full batches before the tighter cap takes over.": "這意味著在更嚴格的上限實施之前，替補席可以完成 5 個完整批次。",
  "That means the expected surviving fraction is about 100%, so the sample expectation is 1 nuclei.": "這意味著預期存活率約為 100%，因此樣本預期為 1 個原子核。",
  "That means the source launches 1.33 cycles each second, each cycle lasts 0.75 s, and the probe parcel repeats that motion after a delay of 0.94 s.": "這意味著來源每秒啟動 1.33 個週期，每個週期持續 0.75 秒，偵測包在延遲 0.94 秒後重複運動。",
  "That oldest-first rule makes the search finish the shallow layer before it moves into deeper nodes like D, E, F, and H.": "最舊優先規則使得搜尋在進入 D、E、F 和 H 等更深節點之前完成淺層。",
  "That path difference is about 0 wavelengths of extra travel, so the wrapped phase comparison is 0 rad.": "此路徑差約為 0 額外行程波長，因此包裹相位比較為 0 rad。",
  "That same": "那個一樣的",
  "That wavelength is the spacing you see on the local strip, and the same \\(\\lambda\\) is what the loop panel tests for a whole-number fit.": "此波長是您在局部帶上看到的間距，而相同的 \\(\\lambda\\) 是環路面板測試整數擬合的值。",
  "That wavelength lands in Visible light, so the current label is green visible light.": "此波長屬於可見光，因此目前的標籤是綠色可見光。",
  "The 3 -> 2 gap is 2.6 eV, so that line lands near 476.86 nm.": "3 -> 2 能隙為 2.6 eV，因此線落在 476.86 nm 附近。",
  "The acid and base character are close here, so the pH scale stays near neutral rather than leaning sharply to one side.": "這裡的酸和鹼特性很接近，因此 pH 值保持在中性附近，而不是急劇向一側傾斜。",
  "The active interval runs from index 0 to 13, so 14 positions are still possible.": "活動區間從索引 0 到 13，因此仍然可以有 14 個位置。",
  "The actual tray stops short of the theoretical marker because yield scales the same recipe cap down.": "實際托盤未達到理論標記，因為產量會按比例縮小相同的配方上限。",
  "The angle sets the quadrant and the component signs, while the radius scales both projections together along the same ray.": "角度設定象限和分量符號，而半徑則沿著同一射線縮放兩個投影。",
  "The axis keeps only the cosine projection of the input, so the transmitted field follows the current partial projection case. That gives a transmitted field amplitude of 0.95 arb..": "此軸僅保留輸入的餘弦投影，因此傳輸場遵循目前的部分投影情況。這給出了 0.95 arb 的傳輸場幅度。",
  "The beaker contains 4.8 units of solute, so the undissolved excess is 0 units whenever the total rises above capacity.": "燒杯含有 4.8 單位溶質；只要總量高於容量，未溶解的過量就是 0 單位。",
  "The beaker currently holds 11 units of solute.": "燒杯目前可容納 11 個單位的溶質。",
  "The bench currently has acid amount 5.8, base amount 4.6, buffer amount 2.4, and water volume 1.4.": "此工作台目前酸量為5.8，鹼量為4.6，緩衝量為2.4，水量為1.4。",
  "The bench currently has acid amount 6.6, base amount 1.8, and water volume 1.2.": "工作台目前酸量為6.6，鹼量為1.8，水量為1.2。",
  "The bench is currently showing n = 3 → 2 發射, so the electron changes between n = 3 and n = 2.": "工作台目前顯示 n = 3 → 2 發射，因此電子在 n = 3 和 n = 2 之間變化。",
  "The bench is running Bubble on a shuffled list.": "替補席上正在運行 Bubble 的名單。",
  "The bench is set to the Continuous case with sample markers at distance": "工作台設定為連續情況，樣本標記位於遠處",
  "The block currently has": "該區塊目前有",
  "The block is at": "該區塊位於",
  "The bridge is strongest when both changing-field terms stay active together. This is the compact intuition behind why Maxwell's equations unify electricity, magnetism, and light.": "當兩個變化場項同時保持活躍時，橋樑最堅固。這就是麥克斯韋方程式統一電、磁和光背後的緊湊直覺。",
  "The buffer still has about 1.2 units of reserve left, and the pH sits near 6.88.": "緩衝液仍有約 1.2 個單位的儲備，pH 值接近 6.88。",
  "The capacitor voltage is still climbing quickly because the first time constant has not finished yet.": "由於第一時間常數尚未完成，因此電容器電壓仍在快速攀升。",
  "The cargo shifts the combined centre of mass to the right, so the total weight now acts to the right of the plank midpoint.": "貨物將組合質心向右移動，因此總重量現在作用於木板中點的右側。",
  "The circular speed here comes from the shared gravity-and-turning balance rather than from a separate orbit rule.": "這裡的圓週速度來自共享的重力和轉動平衡，而不是單獨的軌道規則。",
  "The concave mirror uses signed focal length 0.8 m. An object at 2.4 m with height 1 m forms a inverted, smaller real image at 1.2 m, with magnification -0.5.": "凹面鏡採用符號焦距0.8 m。 2.4 m、高 1 m 的物體在 1.2 m 形成倒立的較小實像，放大倍率為 -0.5。",
  "The coordinate ratio is y / x \\approx 3.46 / 2.00 \\approx 1.73.": "座標比為 y / x \\約 3.46 / 2.00 \\約 1.73。",
  "The current 12 A and 18 B run supports 6 theoretical batches on the 2:3 recipe.": "目前的 12 A 和 18 B 運行支援 2:3 配方的 6 個理論批次。",
  "The current areas give": "目前的地區給",
  "The current box has density": "目前盒子有密度",
  "The current enclosed charge is": "目前包含的電荷是",
  "The current incident angle is 8.86^\\circ above the critical angle, so the refracted branch has already ended.": "目前的入射角比臨界角高8.86^\\circ，因此折射分支已經結束。",
  "The current lower-level gaps create at least two visible lines, and the smaller gap 1.9 eV lands at the longer visible wavelength 652.55 nm.": "目前較低水平的間隙產生至少兩條可見線，較小的間隙 1.9 eV 落在較長的可見波長 652.55 nm 處。",
  "The current midpoint is index 6, which holds 22 while the target is 25.": "目前的中點是指數 6，維持在 22，而目標是 25。",
  "The current non-kinetic store is": "目前的非動能商店是",
  "The current operation is sA + B, so the second piece contributes <1.5, 3>.": "目前的操作是sA + B，所以第二塊貢獻<1.5, 3>。",
  "The current pair is at or above the Rayleigh threshold, so the detector profile can sustain a visible dip between the peaks.": "目前對處於或高於瑞利閾值，因此偵測器輪廓可以維持峰值之間的可見下降。",
  "The current points are z = 2.2 + 1.6i and w = 1.1 + 1.8i.": "當前點是 z = 2.2 + 1.6i 和 w = 1.1 + 1.8i。",
  "The current setting corresponds to": "目前設定對應於",
  "The current setup contains 10 A and 15 B, so A supports 5 batches while B supports 5.": "目前設定包含 10 個 A 和 15 個 B，因此 A 支援 5 個批次，而 B 支援 5 個批次。",
  "The current setup has": "目前設定有",
  "The current solubility limit is 5.8 units per volume.": "目前的溶解度限制為每體積 5.8 單位。",
  "The current time is t = 0.": "當前時間為 t = 0。",
  "The current upper bound is x = 1.2, and the source height there is f(x) = 0.52.": "目前上限為 x = 1.2，源高度為 f(x) = 0.52。",
  "The curve reaches the target after about 5.55 time units.": "曲線在大約 5.55 個時間單位後達到目標。",
  "The denominator vanishes at x = 1, so the graph has a vertical asymptote there and the domain excludes x = 1.": "分母在 x = 1 處消失，因此該圖在那裡有一條垂直漸近線，且域不包括 x = 1。",
  "The detector receives 75% of the incoming intensity, and the output leaves linearly polarized along 50°.": "探測器接收 75% 的入射強度，輸出沿著 50° 線性偏振。",
  "The entry speed is": "進入速度為",
  "The escape threshold comes straight from setting the total energy to zero at the launch point.": "逃逸閾值直接來自於在發射點將總能量設為零。",
  "The expected count comes from repeating the same fractional halving law across equal half-life intervals rather than subtracting a fixed number each second.": "預期計數來自於在相等的半衰期隔內重複相同的分數減半定律，而不是每秒減去固定的數字。",
  "The field is out of the page, so a positive charge launched at 0^\\circ would feel a down magnetic force. Because this charge is positive, the actual force points down.": "磁場超出了頁面範圍，因此在 0^\\circ 處發射的正電荷會感受到向下的磁力。由於該電荷為正，因此實際力指向下方。",
  "The first basis direction stays put while the second basis direction leans right, so the unit square becomes a right-leaning parallelogram.": "第一基本方向保持不變，而第二個基本方向向右傾斜，因此單位正方形變成向右傾斜的平行四邊形。",
  "The first minimum sits about 25.06^\\circ from the center, so the central peak spans roughly 5.05 m on the screen.": "第一個最小值距離中心約 25.06^\\circ，因此中心峰值在螢幕上的跨度約為 5.05 m。",
  "The fluid column contributes": "液柱貢獻",
  "The fluid column is doing most of the work here, so moving deeper or changing density would matter more than changing the same already-moderate surface load.": "流體柱在這裡完成了大部分工作，因此移動更深或改變密度比改變相同的已經適中的表面載荷更重要。",
  "The forward rate is about 3.14/s while the reverse rate is about 0.71/s.": "正向速率約為3.14/s，反向速率約為0.71/s。",
  "The grouped pair reduces by direct addition first, so the total equivalent stays larger before the source current is found.": "分組對首先透過直接加法減少，因此在找到源電流之前總等效值保持較大。",
  "The handle-length push keeps a large moment arm, so the same perpendicular force produces a stronger twist.": "手柄長度的推動保持了較大的力臂，因此相同的垂直力會產生更強的扭轉。",
  "The highlighted group is parallel right now, so one source current reaches the split node and becomes two branch currents.": "突出顯示的群組現在是並聯的，因此一個來源電流到達分裂節點並變成兩個分支電流。",
  "The highlighted pair is a series grouped pair, so": "突出顯示的對是一系列分組對，因此",
  "The horizontal component is": "水平分量是",
  "The horizontal projection gives": "水平投影給出",
  "The identity is not a separate algebra trick. It is the distance formula for one point that never leaves the unit circle.": "恆等式不是一個單獨的代數技巧。它是永不離開單位圓的一點的距離公式。",
  "The input is Linear input at 20° and the polarizer axis is set to 50°, so the bench treats the transmission as an orientation match problem.": "輸入為 20° 線性輸入，偏振器軸設定為 50°，因此工作台將傳輸視為方向匹配問題。",
  "The input is only partly aligned with the axis, so the detector reads a partial transmission and the output is reset to 50°.": "輸入僅部分與軸對齊，因此偵測器讀取部分傳輸並將輸出重設為 50°。",
  "The largest unsorted value will keep drifting toward the right edge.": "最大的未排序值將不斷向右邊緣漂移。",
  "The linked flux is changing enough to drive a clockwise current in the stage convention, which is the model's Lenz-law response to the present change.": "連結的磁通量變化足以驅動舞台慣例中的順時針電流，這是模型對目前變化的楞次定律響應。",
  "The live angle comes from": "直播角度來自",
  "The live time is 0 s, which is 0 half-lives of 2.4 s each.": "存活時間為 0 秒，即 0 個半衰期，每個半衰期為 2.4 秒。",
  "The lower medium is slower, so the transmitted angle is smaller and the ray bends toward the normal.": "下層介質速度較慢，因此透射角較小，光線朝法線方向彎曲。",
  "The magnet is at": "磁鐵位於",
  "The marker is inside the visible window, so this wavelength is green light even though the underlying E and B pairing is the same electromagnetic-wave story.": "標記位於可見視窗內，因此該波長是綠光，儘管底層的 E 和 B 配對是相同的電磁波故事。",
  "The matrix columns are": "矩陣列是",
  "The metal needs": "金屬需要",
  "The middle speed is": "中間速度為",
  "The mixture holds 11 units of solute in 1 units of solvent, giving a concentration of about 11. The beaker is crowded, so the same volume holds a lot of solute.": "此混合物在 1 單位溶劑中容納 11 單位溶質，濃度約為 11。燒杯很擁擠，因此相同體積可容納大量溶質。",
  "The model keeps one object dropping from rest in one fluid, so drag grows with speed until the upward resistive force nearly balances the constant weight.": "該模型使一個物體在流體中從靜止狀態下落，因此阻力隨著速度增加，直到向上的阻力幾乎平衡恆重。",
  "The moment a backward edge appears, this distinction explains why the traversal keeps progressing instead of reopening the cycle.": "當出現向後邊緣時，這種差異解釋了為什麼遍歷會繼續進行而不是重新開始循環。",
  "The momentum is still modest here, so the wavelength stays comparatively long and the local spacing remains easy to see on the strip.": "這裡的動量仍然不大，因此波長保持相對較長，並且在條帶上仍然容易看到局部間距。",
  "The nearby values are agreeing on one shared height, so the graph supports a finite two-sided limit even before you check whether the actual point matches it.": "附近的值在一個共享高度上一致，因此即使在檢查實際點是否與其匹配之前，圖形也支援有限的兩側限制。",
  "The net potential is positive here because the positive contributions outweigh any negative contribution at this probe point.": "這裡的淨勢為正，因為在此探測點的正貢獻超過任何負貢獻。",
  "The object is still in the fast-acceleration part of the fall": "物體仍處於下落的快速加速部分",
  "The one-sided traces are settling toward the same finite height, because the left-hand limit is 1.1 and the right-hand limit is 1.1.": "單側跡線趨於相同的有限高度，因為左側極限為 1.1，右側極限為 1.1。",
  "The path difference is close to a whole wavelength count, so the two slit contributions reinforce and the probe sits on a bright fringe.": "路徑差接近整個波長計數，因此兩個狹縫的貢獻增強，並且探頭位於明亮的邊緣上。",
  "The period comes from the same live circular condition: one full orbit is the circumference divided by the allowed circular speed.": "此週期來自相同的即時圓週條件：一個完整的軌道是周長除以允許的圓週速度。",
  "The perpendicular part of the push is positive here, so the same force geometry builds a counterclockwise twist.": "此處推力的垂直部分為正，因此相同的力幾何形狀會產生逆時針扭曲。",
  "The pH is staying near the middle because the buffer reserve is still absorbing the push. The chemistry is changing, but the reserve bar shows where that change is going.": "pH 值保持在中間附近，因為緩衝儲備仍在吸收推動力。化學反應正在發生變化，但儲備欄顯示了變化的方向。",
  "The piston sets": "活塞組",
  "The point is moving at a moderate speed here, so the curve and the motion cue still feel tightly linked.": "此處的點以中等速度移動，因此曲線和運動提示仍然感覺緊密相連。",
  "The positive cosine value matches the point staying on the right side of the unit circle.": "正餘弦值與位於單位圓右側的點相符。",
  "The positive image distance means the refracted rays actually meet on the far side of the lens, so the image can be projected onto a screen.": "正像距意味著折射光線實際上在鏡頭的遠端相遇，因此影像可以投影到螢幕上。",
  "The probe is": "探頭是",
  "The probe is close enough to the source that the travel delay is short, but the same right-moving disturbance still has to propagate through the medium before the parcel responds.": "探頭距離來源足夠近，因此行進延遲很短，但在包裹響應之前，相同的向右移動擾動仍然必須通過介質傳播。",
  "The probe is near a local zero crossing, so both fields are small together rather than one lagging behind the other.": "探頭接近局部零交叉，因此兩個磁場一起都很小，而不是一個滯後於另一個。",
  "The queue frontier is what turns a graph traversal into a layered search rather than a branch-first dive.": "佇列邊界將圖遍歷轉變為分層搜尋而不是分支優先搜尋。",
  "The ramp length is": "坡道長度為",
  "The reference-point preset sets": "參考點預設集",
  "The resulting pH is about 6.34, with acid share 72.22% and base share 27.78%.": "所得pH值約6.34，酸佔72.22%，鹼佔27.78%。",
  "The same solute is spread through 1 units of solvent.": "相同的溶質分散在 1 單位的溶劑中。",
  "The same state also shows": "同樣的狀態也顯示",
  "The scaled first vector is sA = <3, 2>.": "縮放後的第一向量是 sA = <3, 2>。",
  "The secant runs from": "割線從",
  "The secant slope still differs noticeably, which is the cue that Δx has not shrunk enough yet for the average rate to match the local one closely.": "割線斜率仍有明顯差異，這表明 Δx 尚未縮小到足以使平均速率與本地速率緊密匹配。",
  "The signed area collected from 0 up to this bound is still net positive.": "從 0 到此邊界收集的有符號面積仍然為淨正值。",
  "The solid cylinder sits between the sphere and hoop cases, so its acceleration and travel time stay in the middle as well.": "實心圓柱體位於球體和環形殼體之間，因此它的加速度和行程時間也位於中間。",
  "The source loses": "源頭遺失",
  "the spaces between allowed wavelengths.": "允許的波長之間的空間。",
  "The squared-projection graph shows the same result numerically: 0.36 + 0.64 = 1.00.": "平方投影圖以數字形式顯示了相同的結果：0.36 + 0.64 = 1.00。",
  "The stack frontier is what makes DFS feel deep and path-like on the same graph that BFS explores layer by layer.": "堆疊邊界讓 DFS 在 BFS 逐層探索的同一張圖上感覺很深且像路徑。",
  "The sum keeps the plane honest: (2.2 + 1.1, 1.6 + 1.8).": "總和使平面保持誠實：(2.2 + 1.1, 1.6 + 1.8)。",
  "The supply ratio matches the recipe closely, so both caps land on the same batch count.": "供應比例與配方緊密匹配，因此兩個蓋子的批次數量相同。",
  "The system is in transient decay. The driving frequency is 0.75 times the natural frequency. At t = 0 s the relative displacement is 0.8 a.u., and the predicted steady-state response amplitude is 0.45 a.u..": "系統處於瞬態衰減狀態。驅動頻率為固有頻率的0.75倍。在 t = 0 s 時，相對位移為 0.8 a.u.，預測的穩態響應幅度為 0.45 a.u.。",
  "The system is in transient decay. The driving frequency is 0.75 times the natural frequency. At t = 0.07 s the relative displacement is 0.79 a.u., and the predicted steady-state response amplitude is 0.45 a.u..": "系統處於瞬態衰減狀態。驅動頻率為固有頻率的0.75倍。在 t = 0.07 s 時，相對位移為 0.79 a.u.，預測的穩態響應幅度為 0.45 a.u.。",
  "The target is four times the starting value, so \\(T / y_0 = 12 / 3 = 4\\).": "目標是起始值的四倍，因此 \\(T / y_0 = 12 / 3 = 4\\)。",
  "The transformed curve stays centered horizontally, stays centered vertically, and keeps the original vertical scale. The inside input keeps its left-right orientation. The transformed vertex sits near (1, -2).": "變換後的曲線保持水平居中、垂直居中並保持原始垂直比例。內部輸入保持其左右方向。變換後的頂點位於 (1, -2) 附近。",
  "The tray currently shows 1 nuclei still present, so the sample is being compared with an expectation instead of being forced to equal it exactly.": "托盤目前顯示仍然存在 1 個細胞核，因此正在將樣品與預期進行比較，而不是被迫與它完全相等。",
  "The two wire contributions are closely balanced here, so the final direction has to be read from careful vector addition.": "兩條導線的貢獻在這裡緊密平衡，因此必須透過仔細的向量加法來讀取最終方向。",
  "The wave cycles more slowly here, so each point waits longer for the next full oscillation and the period stays noticeably longer.": "此處波的循環速度較慢，因此每個點等待下一次完整振盪的時間更長，週期明顯更長。",
  "The yield gap is 1.5 batches, so the tray stops short of the theoretical marker.": "產量差距為 1.5 批次，因此托盤未達到理論標記。",
  "Then": "然後",
  "Then \\(\\lambda = h / p\\), so the current matter wavelength is \\(0.33\\,\\mathrm{nm}\\).": "則\\(\\lambda = h / p\\)，所以目前物質波長為\\(0.33\\,\\mathrm{nm}\\)。",
  "Then read comp_A(B) = 3.69. Positive means B still points partly with A, zero means orthogonal, and negative means B points partly against A.": "然後讀取 comp_A(B) = 3.69。正數表示 B 仍部分指向 A，零表示正交，負數表示 B 部分指向 A。",
  "There are 20 inversions still left, so the algorithm is still paying for the remaining disorder step by step.": "還剩下 20 個反轉，因此演算法仍在逐步為剩餘的無序付出代價。",
  "Thermal bench": "熱台",
  "Thermal state": "熱狀態",
  "theta": "西塔",
  "thin-prism sketch": "薄棱鏡草圖",
  "This card is the no-monopoles reminder. Magnetic patterns can intensify without creating a net source term.": "這張卡是無單極提醒。磁圖案可以在不產生淨源項的情況下增強。",
  "This geometry gives a moderate capacitance, so the storage story stays easy to compare against voltage changes.": "這種幾何形狀提供了適度的電容，因此儲存故事很容易與電壓變化進行比較。",
  "This is a middle-pressure state where no single factor is extreme, so the box size, speed scale, and particle count all matter together.": "這是一種中等壓力狀態，沒有任何單一因素是極端的，因此盒子大小、速度尺度和粒子計數都很重要。",
  "This is a moderate-power setup, so the load response is clear without pushing the circuit into the strongest settings.": "這是中等功率設置，因此負載響應清晰，無需將電路推至最強設置。",
  "This is the clean shifted-reciprocal story: one forbidden x-value, one horizontal level, and intercepts that still belong to the same family.": "這是一個乾淨的移位倒數故事：一個禁止的 x 值，一個水平級別，以及仍然屬於同一家族的截距。",
  "This keeps the logarithm tied to one visible crossing: the growth curve must double twice to turn 3 into 12.": "這使得對數與一個可見的交叉點連結在一起：成長曲線必須翻倍兩次才能將 3 變成 12。",
  "This low-c sample has a small m c, so the same pulse drives a much larger temperature change.": "這種低 c 樣品的 m c 較小，因此相同的脈衝會驅動更大的溫度變化。",
  "This page keeps the four equations compact: flux laws on top, circulation laws below, and the light bridge only when the changing-field pair can keep feeding itself.": "本頁使四個方程式保持緊湊：頂部的通量定律，下面的循環定律，以及僅當變化場對能夠保持自身供給時的光橋。",
  "This rectangle is still 7.84 square meters below the best case, and making it wider would move it toward the peak.": "該矩形仍比最佳情況低 7.84 平方米，如果將其加寬，則會將其移向峰值。",
  "This setup is charging, so": "此設定正在充電，因此",
  "This setup sits in the middle, so the balance speed is neither especially low nor especially high.": "該設定位於中間，因此平衡速度既不是特別低，也不是特別高。",
  "This setup still loses some voltage inside the source, but the terminal voltage remains easy to compare against the emf.": "這種設定仍然會損失電源內部的一些電壓，但端子電壓仍然很容易與電動勢進行比較。",
  "This setup uses series loop, so": "此設定使用串聯循環，因此",
  "This smaller sample can still have the same temperature because temperature follows the average particle motion, not the total amount of energy stored across all particles.": "這個較小的樣本仍然可以具有相同的溫度，因為溫度遵循平均粒子運動，而不是所有粒子儲存的能量總量。",
  "Throat": "喉",
  "Throat pressure": "喉嚨壓力",
  "time": "時間",
  "Time marks": "時間標記",
  "total": "全部的",
  "Total": "全部的",
  "Total current": "總電流",
  "Total energy": "總能量",
  "Total rate": "總率",
  "Track position": "軌道位置",
  "trans": "反式",
  "Transformed curve": "變換曲線",
  "Transient displacement": "瞬時位移",
  "Transmitted I/I0": "傳輸 I/I0",
  "tube length": "管長",
  "Turning state": "轉動狀態",
  "turns": "匝",
  "u, phase progress =": "u, 階段進度 =",
  "u/s, dominant path =": "u/s，主導路徑 =",
  "U on m_test": "m_test 上的 U",
  "Ultraviolet": "紫外線",
  "Undecayed nuclei stay filled. Decayed nuclei fade to an empty center.": "未衰變的原子核保持充滿狀態。衰變的原子核褪色到一個空的中心。",
  "under load": "負載下",
  "Unification": "統一",
  "units": "單位",
  "up to the current": "截止目前",
  "upper bound =": "上限 =",
  "Use f = v_wave / λ and Δt = x_p / v_wave. The first relation sets the source frequency; the second relation gives the travel delay to the probe.": "使用 f = v_wave / λ 和 Δt = x_p / v_wave。第一個關係設定來源頻率；第二個關係給出了探頭的行程延遲。",
  "Use the single-slit condition": "使用單縫條件",
  "Use this card to separate field sources from circulation. Charge changes the electric flux balance directly.": "使用此卡將現場來源與流通分開。電荷直接改變電通量平衡。",
  "Using": "使用",
  "Using the bounded pair rule": "使用有界對規則",
  "v2/v1": "v₂/v₁",
  "vertex": "頂點",
  "violet": "紫色",
  "Virtual branch": "虛擬分行",
  "visible": "可見的",
  "Visible": "可見的",
  "visible window": "可見視窗",
  "Visual cues": "視覺提示",
  "volume": "體積",
  "Vstop": "停止電壓",
  "Watch the center glyph and the ring together. The sign of dPhi_B/dt sets the E-circulation sense.": "一起觀察中心字形和環。 dPhi_B/dt 的符號設定電子循環方向。",
  "water": "水",
  "wave cue": "波提示",
  "wavefront circles stay in one medium; pitch changes because arrival timing changes.": "波前圓停留在一種介質中；由於到達時間的變化，音高也會改變。",
  "When": "什麼時候",
  "When both changes keep feeding each other, light appears": "當兩種變化不斷相互促進時，就會出現光",
  "When the bridge-cycle graph points back to visited work, count that edge as a repeat skip and leave the still-waiting frontier in place.": "當橋循環圖指向訪問過的工作時，將該邊緣算作重複跳過，並將仍在等待的邊界保留在適當的位置。",
  "while the room is": "雖然房間是",
  "whole-number fit": "整數擬合",
  "window, so the graph and stage stay on the same oscillation clock.": "窗口，因此圖形和階段保持在相同的振盪時鐘上。",
  "with": "和",
  "With": "和",
  "With 1.6 units of solvent, the beaker can currently hold about 9.28 units of dissolved solute.": "如果有 1.6 單位的溶劑，燒杯目前可容納約 9.28 單位的溶解溶質。",
  "With gravity fixed on this page, the current setup gives": "當重力固定在該頁面上時，當前設定給出",
  "With less liquid in the beaker, the same solute occupies a tighter space and the concentration rises.": "隨著燒杯中液體的減少，相同的溶質佔據較小的空間，濃度升高。",
  "With pole sign": "有桿標誌",
  "with reserve": "有保留",
  "With symmetric placement,": "透過對稱放置，",
  "With the fixed focal length, the same limit maps to an image-plane blur radius of 33.55 um.": "對於固定焦距，相同的限制會對應到 33.55 um 的影像平面模糊半徑。",
  "with the plank midpoint at": "木板中點位於",
  "With this bounded lab using": "在這個有界實驗室中使用",
  "with wavelengths in nanometers.": "波長以奈米為單位。",
  "Work function phi": "功函數 phi",
  "writes": "寫",
  "x-int": "x-整數",
  "X-ray": "X射線",
  "y-int": "y-整數",
  "α = τ / I, with hub inertia": "α = τ / I，帶輪轂慣性",
  "B through coil =": "穿過線圈的 B =",
  "Converging lens": "會聚透鏡",
  "Field through coil": "穿過線圈的磁場",
  "Flux linkage": "磁通鏈結",
  "Galvanometer": "電流計",
  "Lens state": "透鏡狀態",
  "Magnet pass": "磁鐵掠過",
  "aligned": "已對齊",
  "coil": "線圈",
  "into page": "入紙面",
  "north faces coil": "北極朝向線圈",
  "partial light cue": "局部光提示",
  "center ray": "中心光線",
  "clockwise current": "順時針電流",
  "converging": "會聚",
  "left to right": "由左至右",
  "lens": "透鏡",
  "parallel ray": "平行光線",
  "在大約 53.1 度處，單位圓點接近 (0.60, 0.80)，因此 cos theta 約為 0.60，sin theta 約為 0.80。": "大約在 53.1 度處，單位圓上的點接近 (0.60, 0.80)，所以 cos θ 約為 0.60，sin θ 約為 0.80。",
  "大約在53.1度處，單位圓點接近(0.60, 0.80)，因此cos theta大約0.60，sin theta大約0.80。": "大約在 53.1 度處，單位圓上的點接近 (0.60, 0.80)，所以 cos θ 約為 0.60，sin θ 約為 0.80。",
  "對於當前設定，這個solid cylinder應該具備什麼加速度，並且它需要多長時間才能完整地行駛整個": "對於當前設定，這個實心圓柱體應該具備什麼高度，並且它需要多長時間才能完整地轉動整個整個"
} as const;

const prefixRuntimeCopy = [
  [
    "At display t = 0.05 s, the active level pair 4 -> 1 spans 7.2 eV",
    "在顯示 t = 0.05 s 時，有效能階對 4 -> 1 跨度為 7.2 eV，因此對應波長 172.2 nm 的亮發射線。目前能階差圖樣產生 3 條可見線。",
  ],
  [
    "At display t = 0.05 s, the current marker sits in green visible light",
    "在顯示 t = 0.05 s 時，目前標記位於綠色可見光，真空波長為 537.03 nm，實際頻率為 558.24 THz。在所選介質中，折射率 n = 1，波以 1 c 傳播。",
  ],
  [
    "At t = 0 s, a 2 N force is applied 1.6 m from the pivot at 90°",
    "在 t = 0 s 時，2 N 的力以 90° 作用於離支點 1.6 m 的位置。垂直分量為 2 N，因此扭力為 3.2 N m。角加速度為 0.46 rad/s²，棒的角速度為 0 rad/s。",
  ],
  [
    "At t = 0 s, the object has fallen 0 m and is moving at 0 m/s",
    "在 t = 0 s 時，物體下落 0 m，速率為 0 m/s。重力為 19.6 N，阻力為 0 N，此設定的終端速率為 5.72 m/s。物體仍在下落初段，阻力遠小於重力。",
  ],
  [
    "At t = 0.01 s, 1 of 1 nuclei remain while the expectation is about 1",
    "在 t = 0.01 s 時，1 個原子核中仍有 1 個存在，期望值約為 1。半衰期為 2.4 s，所以此時單個原子核的存活機率約為 99.6%。",
  ],
  [
    "At t = 0.01 s, the block is at 149.98 degC",
    "在 t = 0.01 s 時，物塊溫度為 149.98 °C，房間為 25 °C，因此溫差為 124.98 °C。傳導、對流和輻射三條路徑一起轉移能量。",
  ],
  [
    "At t = 0.02 s, the probe is at y = 0 m on a screen 5.4 m away",
    "在 t = 0.02 s 時，探頭位於距離雙縫 5.4 m 的螢幕上，y = 0 m。路徑差為 0 m，相位差為 0 rad，所以該點呈亮紋干涉。",
  ],
  [
    "At t = 0.03 s, the solid cylinder rolls down a 12° incline",
    "在 t = 0.03 s 時，實心圓柱沿 12° 斜面向下滾動，半徑為 0.22 m。無滑動滾動使質心加速度、速率、角速度和轉動能保持連結。",
  ],
  [
    "At t = 0.04 s, a 1.4 T magnet with north faces coil sits at x = -2.55 m",
    "在 t = 0.04 s 時，1.4 T 磁鐵的北極朝向線圈，位於 x = -2.55 m，並由左向右移動。線圈鏈結磁通，因而產生感應電動勢和電流。",
  ],
  [
    "At t = 0.04 s, a positive charge moving at 4.5 m/s in 1.6 T out of the page",
    "在 t = 0.04 s 時，正電荷以 4.5 m/s 在 1.6 T、出紙面的磁場中運動。電荷受力指向左下，對應半徑約為 2.81 m；線段受力方向也由同一右手定則決定。",
  ],
  [
    "At t = 0.04 s, an RC loop with source 8 V",
    "在 t = 0.04 s 時，8 V 電源、2 ohm 電阻和 1 F 電容組成的 RC 迴路時間常數為 2 s。電容電壓上升，電阻壓降下降，電流與儲能同步更新。",
  ],
  [
    "At t = 0.04 s, the electromagnetic wave travels right at 2.8 m/s",
    "在 t = 0.04 s 時，電磁波以 2.8 m/s 向右傳播，波長為 1.8 m。場圖樣以 1.56 Hz 重複，探頭同時讀到電場和磁場的即時值。",
  ],
  [
    "At t = 0.05 s, the six equal masses sit at 0.55 m from the axis",
    "在 t = 0.05 s 時，六個相等質量位於離軸 0.55 m 處，並以 2.4 rad/s 旋轉。這給出轉動慣量、角動量、邊緣速率和當前轉角的即時讀數。",
  ],
  [
    "At t = 0.06 s, the enclosed charge is positive",
    "在 t = 0.06 s 時，包圍電荷為正，所以淨電通量向外，而淨磁通量仍為 0。安培-麥克斯韋項把傳導電流和變化電通量合併為總磁場環流。",
  ],
  [
    "At t = 0.06 s, the two nearby frequencies average 1.06 Hz",
    "在 t = 0.06 s 時，兩個相近頻率的平均值為 1.06 Hz，差值為 0.12 Hz，因此拍頻為 0.12 Hz，響度脈衝每 8.33 s 重複一次。",
  ],
  [
    "At t = 0.07 s, a 12 V source drives a 8 ohm load",
    "在 t = 0.07 s 時，12 V 電源驅動 8 ohm 負載。電流為 1.5 A，所以負載功率為 18 W，傳遞能量隨時間累積。",
  ],
  [
    "At t = 0.11 s, the air column is open at both ends",
    "在 t = 0.11 s 時，空氣柱兩端開放。所選模式是基頻共振，允許波長為 2.4 m，頻率為 14.17 Hz；探頭讀取該位置的位移。",
  ],
  [
    "The converging lens uses signed focal length 0.8 m",
    "會聚透鏡使用帶符號焦距 0.8 m。位於 2.4 m、物高 1 m 的物體形成倒立、較小的實像，像距為 1.2 m，放大率為 -0.5。",
  ],
  [
    "The same pass sets x_m(t), B through the coil, flux linkage, emf, and current.",
    "同一次掠過會同時設定 x_m(t)、穿過線圈的 B、磁通鏈結、感應電動勢和電流。",
  ],
  [
    "A 1 m_e particle moving at 2.2 Mm/s has momentum 2 x10^-24 kg m/s, so its de Broglie wavelength is 0.33 nm. That is close to a whole-number fit of n = 1, so the loop seam nearly closes after 1 wavelengths. This page kee",
    "以 2.2 Mm/s 運動的 1 m_e 粒子的動量為 2 x10^-24 kg m/s，因此其德布羅意波長為 0.33 nm。這接近 n = 1 的整數擬合，因此環縫在 1 個波長後幾乎閉合。此頁面保留..."
  ],
  [
    "A 12 V battery drives resistor A = 6 ohm and resistor B = 6 ohm. The equivalent resistance is 12 ohm, so the total current is 1 A. The circuit is in series, so the same current flows through both resistors. Branch A dro",
    "12 V 電池驅動電阻 A = 6 歐姆和電阻 B = 6 歐姆。等效電阻為 12 歐姆，因此總電流為 1 A。此電路是串聯的，因此流過兩個電阻的電流相同。 A 支線…"
  ],
  [
    "A linearly polarized input at 20° meets a polarizer at 50°, so the relative angle is 30°. The transmitted field amplitude is 0.95 arb., the blocked field is 0.55 arb., and the detector receives 0.75 of the incoming inte",
    "20° 的線性偏振輸入與 50° 的偏振器相遇，因此相對角度為 30°。發射場幅度為 0.95 arb.，阻擋場為 0.55 arb.，偵測器接收 0.75 的傳入訊號…"
  ],
  [
    "A parallel-plate capacitor with plate area 2 area units, separation 2 m, and battery voltage 4 V has capacitance 1, stores charge magnitude 4, creates field strength 2 between the plates, and stores electric energy 8. T",
    "板面積為 2 面積單位、間距為 2 m、電池電壓為 4 V 的平行板電容器的電容為 1，儲存電荷量為 4，在板之間產生場強 2，並儲存電能 8。 T…"
  ],
  [
    "A source mass of 2 kg at the origin produces a gravitational field of (-0.4, -0.3) at the probe (1.6 m, 1.2 m). The probe is 2 m from the source, so |g| is 0.5 in field units and points down-left. A test mass of 1 kg fe",
    "原點處 2 kg 的源質量在探測器 (1.6 m, 1.2 m) 產生 (-0.4, -0.3) 的引力場。探頭距離源頭 2 m，因此 |g|為 0.5（場單位），點位於左下方。 1 kg Fe 的測試質量..."
  ],
  [
    "A source with emf 12 V, internal resistance 1 ohm, and load resistance 6 ohm drives current 1.71 A. The terminal voltage is 10.29 V while the internal drop is 1.71 V. The load takes 17.63 W and the source loses 2.94 W i",
    "電動勢 12 V、內阻 1 歐姆、負載電阻 6 歐姆的源驅動電流 1.71 A。終端電壓為 10.29 V，內部壓降為 1.71 V。負載消耗 17.63 W，源損失 2.94 W i…"
  ],
  [
    "A surface force of 720 N spread over 0.15 m² creates 4.8 kPa of surface pressure. In a water-like fluid at 9.8 m/s², moving to depth 1 m adds 9.8 kPa, so the probe reads 14.6 kPa. The pressure gradient is 9.8 kPa/m. Mos",
    "720 N 的表面力分佈在 0.15 m² 上，產生 4.8 kPa 的表面壓力。在 9.8 m/s² 的類水流體中，移動到 1 m 深度會增加 9.8 kPa，因此探頭讀數為 14.6 kPa。壓力梯度為9.8 kPa/m。莫斯…"
  ],
  [
    "At display t = 0 s, the current marker sits in green visible light with vacuum wavelength 537.03 nm and actual frequency 558.24 THz. In the selected medium n = 1, the wave travels at 1 c and the in-medium wavelength bec",
    "在顯示 t = 0 s 時，目前標記處於綠色可見光中，真空波長為 537.03 nm，實際頻率為 558.24 THz。在所選介質 n = 1 中，波以 1 c 傳播，介質內波長為…"
  ],
  [
    "At display t = 0.01 s, 0.38 PHz light gives photon energy 1.57 eV, which is still below the work function 2.3 eV. No electrons leave the metal, so the stopping potential and collected current both stay at zero even if t",
    "在顯示 t = 0.01 s 時，0.38 PHz 光給出的光子能量為 1.57 eV，仍低於功函數 2.3 eV。沒有電子離開金屬，因此即使 t…，停止電位和收集的電流都保持為零。"
  ],
  [
    "At display t = 0.02 s, the active level pair 4 -> 1 spans 7.2 eV, so it corresponds to the wavelength 172.2 nm as a bright emission line against a dark background. The current gap pattern produces 3 visible lines, and t",
    "在顯示 t = 0.02 s 時，有效能階對 4 -> 1 跨度為 7.2 eV，因此它對應於波長 172.2 nm，作為暗背景下的亮發射線。當前的間隙圖案產生 3 條可見線，並且..."
  ],
  [
    "At display t = 0.07 s, 0.38 PHz light gives photon energy 1.57 eV, which is still below the work function 2.3 eV. No electrons leave the metal, so the stopping potential and collected current both stay at zero even if t",
    "在顯示 t = 0.07 s 時，0.38 PHz 的光給出 1.57 eV 的光子能量，仍低於 2.3 eV 的逸出功。沒有電子離開金屬，因此即使時間推進，截止電壓與收集電流都保持為零。"
  ],
  [
    "At display t = 0.07 s, the active level pair 4 -> 1 spans 7.2 eV, so it corresponds to the wavelength 172.2 nm as a bright emission line against a dark background. The current gap pattern produces 3 visible lines, and t",
    "在顯示 t = 0.07 s 時，有效能階對 4 -> 1 跨度為 7.2 eV，因此它對應於波長 172.2 nm，作為暗背景下的亮發射線。當前的間隙圖案產生 3 條可見線，並且..."
  ],
  [
    "At distance h = 0.55, the left-hand value is 0.85 and the right-hand value is 1.35. Both sides are approaching the same finite height of 1.1, and the actual function value matches it, so the graph is continuous at the t",
    "當距離 h = 0.55 時，左側值為 0.85，右側值為 1.35。兩邊都逼近相同的有限高度 1.1，並且實際函數值與之匹配，因此該圖在 t 處是連續的..."
  ],
  [
    "At t = 0 min, a 1.4 kg sample with specific heat 0.9 kJ/(kg degC) is at 25 degC. The total added energy is 0 kJ, split into 0 kJ of temperature-changing energy and 0 kJ on the phase shelf. Away from the shelf, the curre",
    "在 t = 0 分鐘時，比熱為 0.9 kJ/(kg degC) 的 1.4 kg 樣品處於 25 ℃。總添加能量為 0 kJ，分為 0 kJ 溫度變化能量和 0 kJ 相架上的能量。遠離貨架，當前…"
  ],
  [
    "At t = 0 s, the block is at 150 degC while the room is 25 degC, so the temperature contrast is 125 degC. The pathway rates are 43.74 u/s by conduction, 13.5 u/s by convection, and 6.66 u/s by radiation, for a total of 6",
    "在 t = 0 秒時，模組溫度為 150 ℃，而房間溫度為 25 ℃，因此溫度對比為 125 ℃。傳導的路徑速率為 43.74 u/s，對流為 13.5 u/s，輻射為 6.66 u/s，總共 6…"
  ],
  [
    "At t = 0 s, the launch mass is 1.6 m from the source and moving at 2.24 m/s along the radial line. The local escape speed there is 2.24 m/s, while the circular-orbit comparison speed at that same radius is 1.58 m/s. The",
    "在 t = 0 s 時，發射質量距離源 1.6 m，並沿徑向線以 2.24 m/s 的速率移動。當地逃逸速度為2.24 m/s，而相同半徑處的圓軌道比較速度為1.58 m/s。這…"
  ],
  [
    "At t = 0 s, the motor applies 4 N m while the six equal masses sit at 0.35 m from the axis. That gives a moment of inertia of 1.18 kg m², so the angular acceleration is 3.38 rad/s², the angular speed is 0 rad/s, and the",
    "在 t = 0 s 時，馬達施加 4 N m 的扭矩，而六個相等的質量位於距軸 0.35 m 的位置。這給出了 1.18 kg m² 的慣性矩，因此角加速度為 3.38 rad/s²，角速度為 0 rad/s，且…"
  ],
  [
    "At t = 0 s, the probe is at y = 0 m on a screen 5.4 m away from slits separated by 2.6 m. The path difference is 0 m, giving a phase split of 0 rad and bright interference at that point. The approximate bright-fringe sp",
    "在 t = 0 s 時，探頭位於螢幕上 y = 0 m 處，距狹縫 5.4 m，狹縫間隔 2.6 m。路徑差為 0 米，相位分裂為 0 rad，並在該點產生明亮的干涉。近似的亮邊空間…"
  ],
  [
    "At t = 0 s, the probe is at y = 0 m. The path difference is 0 m, so the total phase difference is 0 rad and the interference is constructive. The resultant displacement is 0.95 a.u., and the relative intensity at that s",
    "在 t = 0 s 時，探頭位於 y = 0 m。路徑差為 0 m，因此總相位差為 0 rad，干涉是相長的。由此產生的位移是 0.95 a.u.，而該處的相對強度…"
  ],
  [
    "At t = 0 s, the source emits 1.1 Hz while moving at 0.55 m/s, so the front spacing is 2.41 m and the rear spacing is 3.41 m. The observer on the ahead side is momentarily stationary relative to the medium, receives 1.33",
    "在 t = 0 s 時，源以 0.55 m/s 的速度移動時發射 1.1 Hz，因此前間距為 2.41 m，後間距為 3.41 m。前方的觀察者相對於介質暫時靜止，接收到 1.33…"
  ],
  [
    "At t = 0.01 s, a 2 N force is applied 1.6 m from the pivot at 90°. The perpendicular component is 2 N, so the torque is 3.2 N m. The angular acceleration is 0.46 rad/s², the bar's angular speed is 4.85e-3 rad/s, and its",
    "在 t = 0.01 s 時，在距離樞軸 90° 1.6 m 施加 2 N 的力。垂直分量為 2 N，因此扭矩為 3.2 N·m。角加速度為 0.46 rad/s²，棒的角速度為 4.85e-3 rad/s，其…"
  ],
  [
    "At t = 0.01 s, an RC loop with source 8 V, resistance 2 ohm, and capacitance 1 F has time constant 2 s. The capacitor voltage is 0.05 V, the resistor drop is 7.95 V, the current is 3.98 A, and the stored energy is 1.02e",
    "在 t = 0.01 s 時，電源電壓為 8 V、電阻為 2 歐姆、電容為 1 F 的 RC 迴路的時間常數為 2 s。電容電壓為0.05V，電阻壓降為7.9​​5V，電流為3.98A，儲存能量為1.02e…"
  ],
  [
    "At t = 0.01 s, the enclosed charge is positive, so the net electric flux points outward while the net magnetic flux still stays 0. Ampere-Maxwell gives total B circulation 0.77 arb. from conduction current 0.7 arb. plus",
    "在 t = 0.01 s 時，封閉的電荷為正，因此淨電通量指向外，而淨磁通量仍保持為 0。安培-麥克斯韋給出總 B 循環 0.77 arb。傳導電流 0.7 任意值。加…"
  ],
  [
    "At t = 0.01 s, the probe is at y = 0 m on a screen 5.4 m away from slits separated by 2.6 m. The path difference is 0 m, giving a phase split of 0 rad and bright interference at that point. The approximate bright-fringe",
    "在 t = 0.01 s 時，探頭位於螢幕上 y = 0 m 處，距狹縫 5.4 m，狹縫間隔 2.6 m。路徑差為 0 米，相位分裂為 0 rad，並在該點產生明亮的干涉。近似的亮邊…"
  ],
  [
    "At t = 0.01 s, the source emits 1.1 Hz while moving at 0.55 m/s, so the front spacing is 2.41 m and the rear spacing is 3.41 m. The observer on the ahead side is momentarily stationary relative to the medium, receives 1",
    "在 t = 0.01 s 時，源以 0.55 m/s 的速度移動時發射 1.1 Hz，因此前部間距為 2.41 m，後部間距為 3.41 m。前方的觀察者相對於介質暫時靜止，接收到 1…"
  ],
  [
    "At t = 0.01 s, the stream carries Q = 0.18 m³/s from section A with area 0.1 m² and speed 1.8 m/s into a throat with area 0.05 m², height rise 0.25 m, speed 3.6 m/s, and static pressure 24.69 kPa. The throat pressure is",
    "在 t = 0.01 s 時，水流攜帶 Q = 0.18 m3/s 從面積 0.1 m2、速度 1.8 m/s 的 A 部分進入面積 0.05 m2、高度上升 0.25 m、速度 3.6 m/s、靜壓 24.69 kPa 的喉。喉嚨壓力是..."
  ],
  [
    "At t = 0.02 min, a 1.4 kg sample with specific heat 0.9 kJ/(kg degC) is at 25.16 degC. The total added energy is 0.2 kJ, split into 0.2 kJ of temperature-changing energy and 0 kJ on the phase shelf. Away from the shelf,",
    "在 t = 0.02 分鐘時，比熱為 0.9 kJ/(kg degC) 的 1.4 kg 樣品的溫度為 25.16 degC。總添加能量為 0.2 kJ，分為 0.2 kJ 溫度變化能量和 0 kJ 相架上的能量。遠離貨架，..."
  ],
  [
    "At t = 0.02 s, the air column is open at both ends. The selected mode is the fundamental resonance and corresponds to the fundamental. The allowed wavelength is 2.4 m and the frequency is 14.17 Hz. At x = 0.3 m, the pro",
    "在 t = 0.02 s 時，空氣柱兩端開放。所選模式是基波諧振並且對應於基波。允許的波長為2.4 m，頻率為14.17 Hz。在 x = 0.3 m 處，pro…"
  ],
  [
    "At t = 0.03 s, a 2 N force is applied 1.6 m from the pivot at 90°. The perpendicular component is 2 N, so the torque is 3.2 N m. The angular acceleration is 0.46 rad/s², the bar's angular speed is 0.01 rad/s, and its ro",
    "在 t = 0.03 s 時，在距離樞軸 90° 1.6 m 施加 2 N 的力。垂直分量為 2 N，因此扭矩為 3.2 N·m。角加速度為0.46 rad/s²，棒的角速度為0.01 rad/s，其旋轉速度為…"
  ],
  [
    "At t = 0.03 s, the object has fallen 4.20e-3 m and is moving at 0.29 m/s. Weight is 19.6 N, drag is 0.05 N, and the terminal speed for this setup is 5.72 m/s. The object is still in the early part of the fall where drag",
    "在 t = 0.03 s 時，物體已下落 4.20e-3 m，並以 0.29 m/s 的速率移動。重量為 19.6 N，阻力為 0.05 N，此設定的終端速度為 5.72 m/s。該物體仍處於秋季早期，阻力......"
  ],
  [
    "At t = 0.03 s, the probe is at y = 0 m. The path difference is 0 m, so the total phase difference is 0 rad and the interference is constructive. The resultant displacement is 1.24 a.u., and the relative intensity at tha",
    "在 t = 0.03 s 時，探頭位於 y = 0 m。路徑差為 0 m，因此總相位差為 0 rad，干涉是相長的。由此產生的位移為 1.24 a.u.，且該位置的相對強度…"
  ],
  [
    "At t = 0.04 s, the electromagnetic wave travels right at 2.8 m/s with wavelength 1.8 m, so the field pattern repeats at 1.56 Hz with period 0.64 s. At the probe x = 2.7 m, the electric field is 0.5 arb. and the magnetic",
    "在 t = 0.04 s 時，電磁波以 2.8 m/s 的速度傳播，波長為 1.8 m，因此場圖以 1.56 Hz 的頻率重複，週期為 0.64 s。在探頭 x = 2.7 m 處，電場為 0.5 arb。和磁性..."
  ],
  [
    "At t = 0.04 s, the probe is at y = 0 m. The path difference is 0 m, so the total phase difference is 0 rad and the interference is constructive. The resultant displacement is 1.35 a.u., and the relative intensity at tha",
    "在 t = 0.04 s 時，探頭位於 y = 0 m。路徑差為 0 m，因此總相位差為 0 rad，干涉是相長的。由此產生的位移是 1.35 a.u.，而該位置的相對強度…"
  ],
  [
    "At t = 0.04 s, the traveling wave moves at 2.4 m/s with wavelength 1.6 m, so the source frequency is 1.5 Hz and the period is 0.67 s. The probe at x = 2.4 m is 1.5 cycles behind the source after a travel delay of 1 s, a",
    "在 t = 0.04 s 時，行波以 2.4 m/s 的速度移動，波長為 1.6 m，因此源頻率為 1.5 Hz，週期為 0.67 s。 x = 2.4 m 處的探頭在 1 s 的行程延遲後落後於源頭 1.5 個週期，a…"
  ],
  [
    "At t = 0.04 s, the two nearby frequencies average 1.06 Hz while their difference is 0.12 Hz, so the beat frequency is 0.12 Hz and the loudness pulse repeats every 8.33 s. The instantaneous envelope is 0.24 m and the bou",
    "在 t = 0.04 s 時，兩個附近頻率的平均值為 1.06 Hz，而它們的差值為 0.12 Hz，因此拍頻為 0.12 Hz，響度脈衝每 8.33 s 重複一次。瞬時包絡線為0.24 m，包絡線…"
  ],
  [
    "At t = 0.05 s, the air column is open at both ends. The selected mode is the fundamental resonance and corresponds to the fundamental. The allowed wavelength is 2.4 m and the frequency is 14.17 Hz. At x = 0.3 m, the pro",
    "在 t = 0.05 s 時，空氣柱兩端開放。所選模式是基波諧振並且對應於基波。允許的波長為2.4 m，頻率為14.17 Hz。在 x = 0.3 m 處，pro…"
  ],
  [
    "At t = 0.05 s, the sample contains 12 particles with temperature 2.81 arb. The average thermal kinetic energy is 2.11 u per particle, while the total internal energy is 36.11 u. In this single-phase stretch, temperature",
    "在 t = 0.05 s 時，樣本包含 12 個顆粒，溫度為 2.81 arb。每個粒子的平均熱動能是 2.11 u，而總內能是 36.11 u。在這個單相拉伸中，溫度…"
  ],
  [
    "At t = 0.05 s, the stream carries Q = 0.18 m³/s through section A with area 0.24 m² and speed 0.75 m/s, then through the middle section with area 0.12 m² and speed 1.5 m/s. The middle section is narrower than section A,",
    "在 t = 0.05 s 時，水流攜帶 Q = 0.18 m3/s 通過面積 0.24 m2、速度 0.75 m/s 的 A 部分，然後通過面積 0.12 m2、速度 1.5 m/s 的中間部分。中間部分比A部分窄，…"
  ],
  [
    "At t = 0.06 s, the traveling wave moves at 2.4 m/s with wavelength 1.6 m, so the source frequency is 1.5 Hz and the period is 0.67 s. The probe at x = 2.4 m is 1.5 cycles behind the source after a travel delay of 1 s, a",
    "在 t = 0.06 s 時，行波以 2.4 m/s 的速度移動，波長為 1.6 m，因此源頻率為 1.5 Hz，週期為 0.67 s。 x = 2.4 m 處的探頭在 1 s 的行程延遲後落後於源頭 1.5 個週期，a…"
  ],
  [
    "At t = 0.07 s, 1 of 1 nuclei remain while the expectation is about 1. The half-life is 2.4 s, so one nucleus has survival probability 98.1% by this time. Because the sample is small, the stepped live count can wander no",
    "在 t = 0.07 s 時，1 個核中的 1 個保留下來，而期望約為 1。半衰期為 2.4 s，因此此時 1 個核的存活機率為 98.1%。由於樣本很小，步進式即時計數可能不會漂移…"
  ],
  [
    "At t = 0.07 s, the block is at 149.89 degC while the room is 25 degC, so the temperature contrast is 124.89 degC. The pathway rates are 43.7 u/s by conduction, 13.49 u/s by convection, and 6.65 u/s by radiation, for a t",
    "在 t = 0.07 s 時，模組溫度為 149.89 ℃，而房間溫度為 25 ℃，因此溫度對比為 124.89 ℃。傳導的路徑速率為 43.7 u/s，對流為 13.49 u/s，輻射為 6.65 u/s，對於 t…"
  ],
  [
    "At t = 0.07 s, the sample contains 12 particles with temperature 2.82 arb. The average thermal kinetic energy is 2.11 u per particle, while the total internal energy is 36.16 u. In this single-phase stretch, temperature",
    "在 t = 0.07 s 時，樣本包含 12 個顆粒，溫度為 2.82 arb。每個粒子的平均熱動能是 2.11 u，而總內能是 36.16 u。在這個單相拉伸中，溫度…"
  ],
  [
    "At t = 0.08 s, 1 of 1 nuclei remain while the expectation is about 1. The half-life is 2.4 s, so one nucleus has survival probability 97.8% by this time. Because the sample is small, the stepped live count can wander no",
    "在 t = 0.08 s 時，1 個核中剩餘 1 個，而期望值約為 1。半衰期為 2.4 s，因此此時 1 個核的存活機率為 97.8%。由於樣本很小，步進式即時計數可能不會漂移…"
  ],
  [
    "At t = 0.09 min, a 1.4 kg sample with specific heat 0.9 kJ/(kg degC) is at 25.88 degC. The total added energy is 1.11 kJ, split into 1.11 kJ of temperature-changing energy and 0 kJ on the phase shelf. Away from the shel",
    "在 t = 0.09 分鐘時，比熱為 0.9 kJ/(kg degC) 的 1.4 kg 樣品的溫度為 25.88 degC。總添加能量為 1.11 kJ，分為 1.11 kJ 溫度變化能量和相架上的 0 kJ。遠離貨架…"
  ],
  [
    "At t = 0.09 s, the motor applies 4 N m while the six equal masses sit at 0.35 m from the axis. That gives a moment of inertia of 1.18 kg m², so the angular acceleration is 3.38 rad/s², the angular speed is 0.3 rad/s, an",
    "在 t = 0.09 s 時，馬達施加 4 N m 的扭矩，而六個相等的質量位於距軸 0.35 m 的位置。轉動慣量為 1.18 kg m²，因此角加速度為 3.38 rad/s²，角速度為 0.3 rad/s，..."
  ],
  [
    "At t = 0.09 s, the object has fallen 0.04 m and is moving at 0.83 m/s. Weight is 19.6 N, drag is 0.42 N, and the terminal speed for this setup is 5.72 m/s. The object is still in the early part of the fall where drag is",
    "在 t = 0.09 s 時，物體下落了 0.04 m，並以 0.83 m/s 的速率移動。重量為 19.6 N，阻力為 0.42 N，設定的終端速度為 5.72 m/s。該物體仍處於秋季初期，阻力是..."
  ],
  [
    "At t = 0.09 s, the six equal masses sit at 0.55 m from the axis and rotate at 2.4 rad/s. That gives a moment of inertia of 2.27 kg m², an angular momentum of 5.44 kg m²/s, a rim speed of 1.32 m/s, and a rotation angle o",
    "在 t = 0.09 s 時，六個相等的質量位於距軸 0.55 m 的位置，並以 2.4 rad/s 的速度旋轉。其慣性矩為 2.27 kg m²，角動量為 5.44 kg m²/s，邊緣速度為 1.32 m/s，旋轉角度為…"
  ],
  [
    "At t = 0.1 s, the solid cylinder rolls down a 12° incline with radius 0.22 m. Rolling without slipping, its center-of-mass acceleration is 1.36 m/s², the current speed is 0.13 m/s, the angular speed is 0.61 rad/s, and t",
    "在 t = 0.1 s 時，實心圓柱體沿著半徑為 0.22 m 的 12° 斜坡滾下。滾動而不滑移，其質心加速度為1.36 m/s²，目前速度為0.13 m/s，角速度為0.61 rad/s，t…"
  ],
  [
    "At t = 0.1 s, the two nearby frequencies average 1.06 Hz while their difference is 0.12 Hz, so the beat frequency is 0.12 Hz and the loudness pulse repeats every 8.33 s. The instantaneous envelope is 0.24 m and the boun",
    "在 t = 0.1 s 時，兩個附近頻率的平均值為 1.06 Hz，而它們的差值為 0.12 Hz，因此拍頻為 0.12 Hz，響度脈衝每 8.33 s 重複一次。瞬時包絡線為 0.24 m，反彈…"
  ],
  [
    "At t = 0.11 s, the sample contains 12 particles with temperature 2.83 arb. The average thermal kinetic energy is 2.12 u per particle, while the total internal energy is 36.28 u. In this single-phase stretch, temperature",
    "在 t = 0.11 s 時，樣本包含 12 個顆粒，溫度為 2.83 arb。每個粒子的平均熱動能是 2.12 u，而總內能是 36.28 u。在這個單相拉伸中，溫度…"
  ],
  [
    "At the probe (-0.8 m, 0.8 m), charges 2 q and -2 q separated by 2.4 m give V_A = 2.24 and V_B = -0.93, so the net potential is 1.31. The probe sits in a positive-potential region. The local field magnitude is 2.57 and T",
    "在探針 (-0.8 m, 0.8 m) 處，相距 2.4 m 的電荷 2 q 和 -2 q 給出 V_A = 2.24 和 V_B = -0.93，因此淨電位為 1.31。探針位於正電位區域。當地場震級為 2.57，T…"
  ],
  [
    "At the probe (0 m, 1 m), currents 2 A and -2 A separated by 2.4 m produce B_x = 0 and B_y = 1.97, so the net magnetic field is 1.97 in field units and points up. The two wire senses compete, so the local net direction h",
    "在探頭 (0 m, 1 m) 處，相距 2.4 m 的電流 2 A 和 -2 A 產生 B_x = 0 和 B_y = 1.97，因此淨磁場以場單位表示為 1.97，並且指向上方。兩種線感相互競爭，因此區域網路方向..."
  ],
  [
    "At x = 1.2, the source height is 0.52 and the accumulated amount from 0 to x is 1.01. The source height is positive here, so moving the bound slightly to the right adds positive area. The running total is still positive",
    "當x = 1.2時，源高度為0.52，從0到x的累加量為1.01。此處來源高度為正，因此稍微向右移動邊界會增加正面積。運行總數仍然為正…"
  ],
  [
    "Binary search is looking for 25 inside an ordered list of 14 values. It has used 0 midpoint checks so far. The live interval spans 0 to 13, so only 14 positions still matter. A left-to-right scan would still need 8 chec",
    "二分查找在 14 個值的有序列表中找出 25。到目前為止，它使用了 0 次中點檢定。即時間隔跨越 0 到 13，因此只有 14 個位置仍然重要。從左到右掃描仍然需要 8 個檢查..."
  ],
  [
    "M e1 = <1, 0>, M e2 = <1, 1>, and the tracked probe lands at <2.7, 1.1>. The transformed square keeps its orientation, so the action stays on the non-reflecting side. Off-axis entries are leaning the basis vectors, so t",
    "M e1 = <1, 0>，M e2 = <1, 1>，追蹤偵測器著陸於 <2.7, 1.1>。變換後的正方形保持其方向，因此作用保持在非反射側。離軸條目正在傾斜基底向量，所以…"
  ],
  [
    "The exponential curve grows from 3 with continuous rate k = 0.25. The target 12 is reached at about t = 5.55. The doubling time is about 2.77, where the amount reaches 6. The inverse question becomes logarithmic because",
    "指數曲線從 3 開始成長，連續率 k = 0.25。大約 t = 5.55 時達到目標 12。倍增時間約 2.77，其中數量達 6。逆問題變成對數，因為…"
  ],
  [
    "The gas has 24 particles at 3.2 temperature units in volume 1.6, so the density is 15 particles per volume unit. The bounded kinetic model gives an average speed of 2.41 u/s and a wall collision rate of 82.48 hits/s, wh",
    "此氣體在體積為 1.6 時在 3.2 個溫度單位下有 24 個粒子，因此密度為每體積單位 15 個粒子。有界動力學模型給出的平均速度為 2.41 u/s，牆壁碰撞率為 82.48 次/s，wh…"
  ],
  [
    "The mixture uses 4.6 units in direct neutralization, keeps about 1.2 units of buffer reserve, and sits near pH 6.88. The buffer is still absorbing the imbalance, so the pH stays near the middle even though the mixture i",
    "此混合物在直接中和中使用 4.6 個單位，保留約 1.2 個單位的緩衝液儲備，pH 值接近 6.88。緩衝液仍在吸收不平衡，因此 pH 值保持在中間附近，即使混合物…"
  ],
  [
    "The reciprocal family has vertical asymptote x = 1 and horizontal asymptote y = -1. At distance d = 0.65, the left branch is -4.08 and the right branch is 2.08. To the right of the vertical asymptote the branch sits abo",
    "倒數族的垂直漸近線 x = 1，水平漸近線 y = -1。在距離 d = 0.65 處，左分支為 -4.08，右分支為 2.08。在垂直漸近線的右側，分支位於…"
  ],
  [
    "A 4 kg plank carries 3 kg of cargo at x = 0.8 m. The total mass is 7 kg and the combined centre of mass is at x_CM = 0.34 m. The support region runs from -0.36 m to 1.04 m, so the current reactions are R_left = 34.16 N",
    "一塊 4 kg 的木板在 x = 0.8 m 可承載 3 kg 的貨物。總質量為 7 kg，組合質心位於 x_CM = 0.34 m。支撐區域從-0.36 m到1.04 m，所以目前的反應是R_left = 34.16 N…"
  ],
  [
    "At display t = 0 s, the active level pair 4 -> 1 spans 7.2 eV, so it corresponds to the wavelength 172.2 nm as a bright emission line against a dark background. The current gap pattern produces 3 visible lines, and the",
    "在顯示 t = 0 s 時，有效能階對 4 -> 1 跨度為 7.2 eV，因此它對應於波長 172.2 nm，作為暗背景下的亮發射線。目前的間隙圖案產生 3 條可見線，並且…"
  ],
  [
    "At t = 0 s, a 12 V source drives a 8 ohm load. The current is 1.5 A, so the load power is 18 W and the delivered energy is 0 J. The load is dissipating power quickly enough that its visible response is strong but still",
    "在 t = 0 秒時，12 V 電源驅動 8 歐姆負載。電流為 1.5 A，因此負載功率為 18 W，傳遞的能量為 0 J。負載耗散功率的速度足夠快，其可見響應很強，但仍然..."
  ],
  [
    "At t = 0 s, the air column is open at both ends. The selected mode is the fundamental resonance and corresponds to the fundamental. The allowed wavelength is 2.4 m and the frequency is 14.17 Hz. At x = 0.3 m, the probe",
    "在 t = 0 s 時，空氣柱兩端開放。所選模式是基波諧振並且對應於基波。允許的波長為2.4 m，頻率為14.17 Hz。在 x = 0.3 m 處，探頭..."
  ],
  [
    "At t = 0 s, the traveling wave moves at 2.4 m/s with wavelength 1.6 m, so the source frequency is 1.5 Hz and the period is 0.67 s. The probe at x = 2.4 m is 1.5 cycles behind the source after a travel delay of 1 s, and",
    "在 t = 0 s 時，行波以 2.4 m/s 的速度移動，波長為 1.6 m，因此源頻率為 1.5 Hz，週期為 0.67 s。在 1 s 的行程延遲後，x = 2.4 m 處的探頭落後源 1.5 個週期，且…"
  ],
  [
    "At t = 0.03 s, a positive charge moving at 4.5 m/s in 1.6 T out of the page has F_q = (-0.37, -7.19), so the charge force points down-left with a radius of about 2.81 m. The matching wire segment force points down with",
    "在 t = 0.03 s 時，正電荷以 4.5 m/s 的速度在 1.6 T 內移動到頁面外，其 F_q = (-0.37, -7.19)，因此電荷力指向左下，半徑約為 2.81 m。匹配的線段力指向下方…"
  ],
  [
    "At t = 0.03 s, the solid cylinder rolls down a 12° incline with radius 0.22 m. Rolling without slipping, its center-of-mass acceleration is 1.36 m/s², the current speed is 0.05 m/s, the angular speed is 0.21 rad/s, and",
    "在 t = 0.03 s 時，實心圓柱體沿著半徑為 0.22 m 的 12° 斜坡滾下。滾動而不滑移，其質心加速度為1.36 m/s²，目前速度為0.05 m/s，角速度為0.21 rad/s，且…"
  ],
  [
    "At t = 0.04 s, a positive charge moving at 4.5 m/s in 1.6 T out of the page has F_q = (-0.51, -7.18), so the charge force points down-left with a radius of about 2.81 m. The matching wire segment force points down with",
    "在 t = 0.04 s 時，正電荷以 4.5 m/s 的速度在 1.6 T 內移動到頁面外，其 F_q = (-0.51, -7.18)，因此電荷力指向左下，半徑約為 2.81 m。匹配的線段力指向下方…"
  ],
  [
    "At t = 0.05 s, an RC loop with source 8 V, resistance 2 ohm, and capacitance 1 F has time constant 2 s. The capacitor voltage is 0.2 V, the resistor drop is 7.8 V, the current is 3.9 A, and the stored energy is 0.02 J.",
    "在 t = 0.05 s 時，電源電壓為 8 V、電阻為 2 歐姆、電容為 1 F 的 RC 迴路的時間常數為 2 s。電容電壓為0.2V，電阻壓降為7.8V，電流為3.9A，儲存能量為0.02J…"
  ],
  [
    "At t = 0.06 s, the object has fallen 0.02 m and is moving at 0.58 m/s. Weight is 19.6 N, drag is 0.2 N, and the terminal speed for this setup is 5.72 m/s. The object is still in the early part of the fall where drag is",
    "在 t = 0.06 s 時，物體已下落 0.02 m，速度為 0.58 m/s。重力為 19.6 N，阻力為 0.2 N，而這組設定的終端速度為 5.72 m/s。物體仍處於下落初段，阻力仍然較小。"
  ],
  [
    "At t = 0.09 s, a 12 V source drives a 8 ohm load. The current is 1.5 A, so the load power is 18 W and the delivered energy is 1.71 J. The load is dissipating power quickly enough that its visible response is strong but",
    "在 t = 0.09 s 時，12 V 電源驅動 8 歐姆負載。電流為 1.5 A，因此負載功率為 18 W，傳遞的能量為 1.71 J。負載耗散功率的速度夠快，其可見響應很強，但是…"
  ],
  [
    "At t = 0.1 s, the probe is at y = 0 m on a screen 5.4 m away from slits separated by 2.6 m. The path difference is 0 m, giving a phase split of 0 rad and bright interference at that point. The approximate bright-fringe",
    "在 t = 0.1 s 時，探頭位於螢幕上 y = 0 m 處，距狹縫 5.4 m，狹縫間隔 2.6 m。路徑差為 0 米，相位分裂為 0 rad，並在該點產生明亮的干涉。近似的亮边…"
  ],
  [
    "At t = 0.1 s, the stream carries Q = 0.18 m³/s through section A with area 0.24 m² and speed 0.75 m/s, then through the middle section with area 0.12 m² and speed 1.5 m/s. The middle section is narrower than section A,",
    "在 t = 0.1 s 時，水流攜帶 Q = 0.18 m3/s 通過面積 0.24 m2、速度 0.75 m/s 的 A 部分，然後通過面積 0.12 m2、速度 1.5 m/s 的中間部分。中間部分比A部分窄，…"
  ],
  [
    "At the probe (1.6 m, 1.2 m), a source mass of 2 kg gives gravitational potential phi = -1 relative to zero at infinity. The probe sits partway up the potential well, so phi is negative but not as deep as it is near the",
    "在探頭 (1.6 m、1.2 m) 處，2 kg 的源質量給出相對於無窮遠處零的引力位能 phi = -1。探針位於勢阱的中間位置，因此 phi 為負值，但深度沒有靠近..."
  ],
  [
    "Rolling without slipping keeps translation and rotation locked together. The slope sets the available downhill pull, while the inertia factor decides how that pull splits between speeding up the center and spinning the",
    "滾動而不滑動可將平移和旋轉鎖定在一起。坡度決定了可用的下坡拉力，而慣性因素決定了拉力如何在加速中心和旋轉之間分配..."
  ],
  [
    "Rolling without slipping keeps translation and rotation locked together. The slope sets the available downhill pull, while the inertia factor decides how that pull splits between speeding up the center and spinning the",
    "滾動而不滑動可將平移和旋轉鎖定在一起。坡度決定了可用的下坡拉力，而慣性因素決定了拉力如何在加速中心和旋轉之間分配..."
  ],
  [
    "With perimeter 24 m, the rectangle is 3.2 m by 8.8 m for area 28.16 m². The local area slope is 5.6. The area curve is still rising here, so making the rectangle a little wider would increase the area. The rectangle is",
    "此長方形的周長為 24 m，尺寸為 3.2 m x 8.8 m，面積為 28.16 m²。當地坡度為5.6。此處面積曲線仍在上升，因此將矩形加寬一點會增加面積。矩形是..."
  ]
] as const;

const containsRuntimeCopy = [
  [
    "The path difference is",
    "探針位於螢幕中心附近；兩條路徑的路徑差、相位差、合成位移和相對強度會一起顯示干涉狀態。",
  ],
  [
    "a 1.4 kg sample with specific heat",
    "1.4 kg 樣本正在受熱；比熱、加入能量、溫度變化能量和相變平台能量會一起顯示目前熱狀態。",
  ],
  [
    "the unit-circle point sits in Quadrant",
    "單位圓上的點正在旋轉；水平投影是 cos(theta)，垂直投影是 sin(theta)，完整一圈的時間保持可見。",
  ],
  [
    "a 12 V source drives a 8 ohm load",
    "12 V 電源正在驅動 8 ohm 負載；電流、負載功率、已輸送能量和可見負載反應會一起更新。",
  ],
  [
    "the two nearby frequencies average",
    "兩個相近頻率的平均值與差值共同決定拍頻；響度脈衝會按拍頻重複，而包絡和響度提示同步更新。",
  ],
  [
    "the particle is at",
    "粒子目前位於圓周上的即時角度與座標；切向速率保持不變，向心加速度指向圓心。",
  ],
  [
    "The system is in transient decay.",
    "系統處於暫態衰減。驅動頻率與自然頻率的比例、即時相對位移和預測穩態振幅會一起顯示。",
  ],
  [
    "a 2 N force is applied 1.6 m from the pivot",
    "2 N 的力作用於離支點 1.6 m 的位置。垂直分量產生扭力，並推動角加速度、角速度和轉角同步更新。",
  ],
  [
    "the object has fallen",
    "物體已下落並正在加速。重力、阻力和終端速率一起顯示，說明目前仍處於阻力較小的下落初段。",
  ],
  [
    "the sample contains 12 particles with temperature",
    "樣本包含 12 個粒子；平均熱動能、總內能和相態進度會隨溫度與粒子設定同步更新。",
  ],
  [
    "the block is at",
    "物塊與房間之間存在溫差；傳導、對流和輻射三條路徑共同決定總熱流率。",
  ],
  [
    "a 1.4 T magnet with north faces coil",
    "1.4 T 磁鐵的北極朝向線圈並掠過線圈；磁通鏈結的變化會產生感應電動勢和電流。",
  ],
  [
    "(partial light cue)",
    "任意值（局部光提示）",
  ],
  [
    "the enclosed charge is positive",
    "包圍電荷為正，所以淨電通量向外，而淨磁通量仍為 0；安培-麥克斯韋項合併傳導電流與變化電通量。",
  ],
  [
    "the electromagnetic wave travels right",
    "電磁波向右傳播；波長、頻率、週期和探頭上的電場與磁場讀數由同一波形決定。",
  ],
  [
    "the current marker sits in green visible light",
    "目前標記位於綠色可見光；真空波長、實際頻率、介質折射率和介質內波長會同步顯示。",
  ],
  [
    "light gives photon energy",
    "入射光給出的光子能量仍低於功函數，因此沒有電子離開金屬，截止電壓和收集電流維持為零。",
  ],
  [
    "the active level pair 4 -> 1 spans 7.2 eV",
    "有效能階對 4 -> 1 跨度為 7.2 eV，對應暗背景上的亮發射線；目前能階差圖樣產生可見譜線。",
  ],
  [
    "nuclei remain while the expectation is about",
    "原子核的實際剩餘數與期望值一起顯示；半衰期決定存活機率，小樣本的階梯式計數仍可能跳動。",
  ],
  [
    "the point is near",
    "點目前位於參數曲線上的即時位置；路徑寬度、高度和運動速率一起描述同一條軌跡。",
  ],
  [
    "the traveling wave moves",
    "行波正在同一介質中前進；波速、波長、頻率、週期、探頭延遲和探頭位移會由同一個即時波形決定。",
  ],
  [
    "the air column is open at both ends",
    "空氣柱兩端開放。所選共振模式決定允許波長與頻率，探頭位置讀取該模式下的即時位移。",
  ],
  [
    "the motor applies 4 N m",
    "馬達施加 4 N m 扭力；六個相等質量的位置決定轉動慣量，進而決定角加速度、角速度和轉角。",
  ],
  [
    "the solid cylinder rolls down",
    "實心圓柱沿斜面無滑動滾下；質心加速度、速率、角速度和轉動能保持同一滾動約束。",
  ],
  [
    "the six equal masses sit",
    "六個相等質量位於同一半徑並一起旋轉；轉動慣量、角動量、邊緣速率和轉角同步顯示。",
  ],
  [
    "edge-to-edge path difference",
    "探頭位於中央位置，邊到邊路徑差為 0 m；包絡、相對強度和第一個暗紋角度一起顯示。",
  ],
  [
    "the source emits",
    "聲源正在發出波並相對介質移動；前方與後方間距不同，因此觀察者接收到的頻率會跟位置與相對運動一起改變。",
  ],
  [
    "the stream carries Q =",
    "流管以同一流量穿過不同截面；截面面積變小時速度上升，連續性把兩個位置的讀數連在一起。",
  ],
  [
    "from section A with area",
    "流體從 A 段進入較窄喉部；速度、高度和靜壓共同守住伯努利能量帳。",
  ],
  [
    "an RC loop with source 8 V",
    "8 V 電源、2 ohm 電阻和 1 F 電容組成的 RC 迴路具有 2 s 時間常數；電容電壓、電阻壓降、電流和儲能同步變化。",
  ],
  [
    "a positive charge moving at 4.5 m/s",
    "正電荷在出紙面的磁場中運動；電荷受力與導線受力由同一右手定則決定。",
  ],
  [
    "the launch mass is",
    "發射質量位於源附近並沿徑向運動；當地逃逸速率與圓軌道比較速率一起顯示目前是否達到逃逸門檻。",
  ],
] as const;

const nonDisplayPropNames = new Set([
  "id", "key", "ref", "role", "className", "style", "href", "src", "type", "name",
  "value", "defaultValue", "checked", "defaultChecked", "width", "height", "x", "y",
  "x1", "x2", "y1", "y2", "cx", "cy", "r", "d", "viewBox",
]);

function normalizeRuntimeCopy(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

const zhHkCleanupReplacements: [RegExp, string][] = [
  [/工作台/gu, "實驗台"],
  [/绑定/gu, "綁定"],
  [/为/gu, "為"],
  [/这/gu, "這"],
  [/设/gu, "設"],
  [/读/gu, "讀"],
  [/图/gu, "圖"],
  [/点/gu, "點"],
  [/线/gu, "線"],
  [/术/gu, "術"],
  [/层/gu, "層"],
  [/触/gu, "觸"],
  [/样/gu, "樣"],
  [/压/gu, "壓"],
  [/观/gu, "觀"],
  [/际/gu, "際"],
  [/动/gu, "動"],
  [/让/gu, "讓"],
  [/页/gu, "頁"],
  [/发/gu, "發"],
  [/总/gu, "總"],
  [/时/gu, "時"],
  [/数/gu, "數"],
  [/条/gu, "條"],
  [/颗/gu, "顆"],
  [/级/gu, "級"],
  [/测/gu, "測"],
  [/并/gu, "並"],
  [/运/gu, "運"],
  [/应/gu, "應"],
  [/觉/gu, "覺"],
  [/气/gu, "氣"],
  [/温/gu, "溫"],
  [/关/gu, "關"],
  [/闭/gu, "閉"],
];

function cleanupZhHkRuntimeCopy(value: string) {
  return zhHkCleanupReplacements.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value,
  );
}

export function localizeExactZhHkRuntimeCopy(locale: AppLocale | string | undefined, text: string) {
  if (locale !== "zh-HK") return text;
  const normalized = normalizeRuntimeCopy(text);
  if (normalized === "Live") return "即時";
  const noLightCueMatch = normalized.match(/^([0-9.]+) arb\. \(no light cue\)$/u);
  if (noLightCueMatch) return `${noLightCueMatch[1]} 任意單位（無光提示）`;
  const exact = exactRuntimeCopy[normalized as keyof typeof exactRuntimeCopy];
  if (exact) return cleanupZhHkRuntimeCopy(exact);
  const prefix = prefixRuntimeCopy.find(([englishPrefix]) => normalized.startsWith(englishPrefix));
  if (prefix) return cleanupZhHkRuntimeCopy(prefix[1]);
  const contains = containsRuntimeCopy.find(([englishNeedle]) => normalized.includes(englishNeedle));
  return contains ? cleanupZhHkRuntimeCopy(contains[1]) : text;
}

function shouldLocalizeProp(name: string) {
  return !nonDisplayPropNames.has(name) && !name.startsWith("on") && !name.startsWith("data-") && !name.startsWith("aria-");
}

function localizeRuntimePropValue(locale: AppLocale | string | undefined, value: unknown): unknown {
  if (typeof value === "string") return localizeExactZhHkRuntimeCopy(locale, value);
  if (Array.isArray(value)) return value.map((item) => localizeRuntimePropValue(locale, item));
  if (value && typeof value === "object" && !isValidElement(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, shouldLocalizeProp(key) ? localizeRuntimePropValue(locale, nested) : nested]));
  }
  return value;
}

export function localizeExactZhHkRuntimeNode(locale: AppLocale | string | undefined, node: ReactNode): ReactNode {
  if (locale !== "zh-HK") return node;
  if (typeof node === "string") return localizeExactZhHkRuntimeCopy(locale, node);
  if (Array.isArray(node)) return node.map((child) => localizeExactZhHkRuntimeNode(locale, child));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props = element.props ?? {};
  const nextProps: Record<string, unknown> = {};
  let changed = false;
  for (const [key, value] of Object.entries(props)) {
    if (key === "children") continue;
    const nextValue = shouldLocalizeProp(key) ? localizeRuntimePropValue(locale, value) : value;
    nextProps[key] = nextValue;
    changed ||= nextValue !== value;
  }
  const children = Children.map(props.children as ReactNode, (child) => localizeExactZhHkRuntimeNode(locale, child));
  if (children !== props.children) changed = true;
  return changed ? cloneElement(element, nextProps, children) : node;
}

function localizeExactZhHkRuntimeDom(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const node of textNodes) {
    const current = node.nodeValue;
    if (!current) continue;
    const localized = localizeExactZhHkRuntimeCopy("zh-HK", current);
    if (localized !== current) {
      node.nodeValue = localized;
    }
  }
}

export function useExactZhHkRuntimeDomLocalization(
  locale: AppLocale | string | undefined,
  rootRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (locale !== "zh-HK") return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    localizeExactZhHkRuntimeDom(root);

    const observer = new MutationObserver(() => {
      localizeExactZhHkRuntimeDom(root);
    });
    observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale, rootRef]);
}
