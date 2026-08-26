/* ENIGMA / 03 — Unignorability® strings
   Extracted from index.html:1726–2169 (kineticLetters) with js/constel-data.js
   inlined below, so this is a single paste-able field.

   DEPENDENCY: GSAP (gsap.ticker, gsap.delayedCall, gsap.utils.random).
   Load _global/global.js first, or add <script src="/js/gsap.min.js"> to the
   site template. The IIFE is wrapped in enigmaReady() so load order is safe.

   Live tuning hook: window.__ROPE (see the QA note near the bottom). */

/* ---- Glyph vectors: Figma node 45:882, viewBox 1494 x 799.4 ----
   15 paths (U-n-i-g-n-o-r-a-b-i-l-i-t-y-®) + the 14 bonds threading them. */
window.CONSTEL = {
  paths: ["M151.928 66.5362C151.928 56.2042 147.336 51.9402 137.496 51.9402H133.232C132.248 51.9402 131.592 51.2842 131.592 50.3002V47.8402C131.592 46.8562 132.248 46.2002 133.232 46.2002H176.364C177.348 46.2002 178.004 46.8562 178.004 47.8402V50.3002C178.004 51.2842 177.348 51.9402 176.364 51.9402H170.46C165.54 51.9402 160.948 56.2042 160.948 66.5362V113.276C160.948 145.256 142.252 163.296 111.748 163.296C77.9641 163.296 59.7601 148.7 59.7601 118.36V61.6162C59.7601 54.5642 55.1681 51.9402 50.2481 51.9402H44.3441C43.3601 51.9402 42.7041 51.2842 42.7041 50.3002V47.8402C42.7041 46.8562 43.3601 46.2002 44.3441 46.2002H94.8561C95.8401 46.2002 96.4961 46.8562 96.4961 47.8402V50.3002C96.4961 51.2842 95.8401 51.9402 94.8561 51.9402H88.9521C84.0321 51.9402 79.4401 54.5642 79.4401 61.6162V118.36C79.4401 139.844 87.9681 155.588 111.748 155.588C137.332 155.588 151.928 142.96 151.928 113.276V66.5362Z","M252.36 313.584C252.36 320.636 256.952 323.26 261.708 323.26H267.612C268.596 323.26 269.252 323.916 269.252 324.9V327.36C269.252 328.344 268.596 329 267.612 329H219.068C218.084 329 217.592 328.344 217.592 327.36V324.9C217.592 323.916 218.084 323.26 219.068 323.26H224.972C229.728 323.26 234.32 320.636 234.32 313.584V259.3C234.32 254.38 232.516 252.74 228.58 252.74H220.708C219.724 252.74 219.232 252.248 219.232 251.264V249.296C219.232 248.148 219.724 247.492 220.872 247.164L246.62 239.62C248.096 239.128 249.244 238.8 250.884 238.8C251.868 238.8 252.36 239.456 252.36 240.44V256.184C266.956 239.62 280.24 236.176 290.408 236.176C308.776 236.176 322.88 247.164 322.88 268.32V313.584C322.88 320.636 327.308 323.26 332.228 323.26H337.968C338.952 323.26 339.608 323.916 339.608 324.9V327.36C339.608 328.344 338.952 329 337.968 329H289.752C288.768 329 288.112 328.344 288.112 327.36V324.9C288.112 323.916 288.768 323.26 289.752 323.26H295.492C300.248 323.26 304.84 320.636 304.84 313.584V271.6C304.84 256.348 295.656 248.312 283.356 248.312C273.188 248.312 263.184 252.74 252.36 266.188V313.584Z","M438.684 69.1721C431.304 69.1721 426.056 63.9241 426.056 56.5441C426.056 49.1641 431.304 44.0801 438.684 44.0801C445.9 44.0801 450.984 49.1641 450.984 56.5441C450.984 63.9241 445.9 69.1721 438.684 69.1721ZM448.36 156.584C448.36 163.636 452.952 166.26 457.708 166.26H463.612C464.596 166.26 465.252 166.916 465.252 167.9V170.36C465.252 171.344 464.596 172 463.612 172H415.068C414.084 172 413.592 171.344 413.592 170.36V167.9C413.592 166.916 414.084 166.26 415.068 166.26H420.972C425.728 166.26 430.32 163.636 430.32 156.584V105.58C430.32 100.66 428.352 99.0201 424.58 99.0201H416.708C415.724 99.0201 415.232 98.5281 415.232 97.5441V95.5761C415.232 94.4281 415.56 94.1001 416.872 93.4441L440.324 83.1121C441.636 82.4561 443.44 81.8001 444.588 81.8001H446.884C447.868 81.8001 448.36 82.4561 448.36 83.4401V156.584Z","M519.776 386.92C534.208 386.92 540.276 378.228 540.276 364.78C540.276 351.988 532.732 336.9 514.692 336.9C500.424 336.9 494.52 345.428 494.52 359.532C494.52 372.16 501.736 386.92 519.776 386.92ZM558.808 361.828C558.808 380.852 542.244 393.644 517.48 393.644C509.772 393.644 502.556 392.168 496.16 389.38C492.552 392.824 489.272 396.596 489.272 399.22C489.272 401.68 492.224 403.32 495.504 403.648L538.636 407.748C566.024 410.372 569.632 420.212 569.632 427.428C569.632 443.172 545.688 457.932 511.248 457.932C483.696 457.932 468.28 451.208 468.28 439.564C468.28 431.2 477.3 422.344 484.516 416.932C477.792 413.98 475.824 409.716 475.824 406.6C475.824 400.86 482.056 393.972 490.42 386.428C481.728 380.852 475.988 372.16 475.988 361.828C475.988 342.804 492.88 330.176 517.48 330.176C525.844 330.176 534.208 331.816 540.932 334.932C551.264 324.764 557.988 318.368 564.876 318.368C569.632 318.368 574.224 321.156 574.224 327.716C574.224 333.456 572.092 336.9 567.992 336.9C562.58 336.9 561.432 333.948 555.364 333.948C552.74 333.948 550.772 334.276 546.016 337.72C553.724 342.968 558.808 351.004 558.808 361.828ZM483.532 430.708C483.532 440.876 502.228 447.272 521.908 447.272C544.54 447.272 556.84 439.564 556.84 431.692C556.84 427.264 552.74 425.132 539.292 423.82L495.504 419.556C493.864 419.392 492.224 419.228 490.584 418.9C486.484 422.836 483.532 426.444 483.532 430.708Z","M198.36 667.584C198.36 674.636 202.952 677.26 207.708 677.26H213.612C214.596 677.26 215.252 677.916 215.252 678.9V681.36C215.252 682.344 214.596 683 213.612 683H165.068C164.084 683 163.592 682.344 163.592 681.36V678.9C163.592 677.916 164.084 677.26 165.068 677.26H170.972C175.728 677.26 180.32 674.636 180.32 667.584V613.3C180.32 608.38 178.516 606.74 174.58 606.74H166.708C165.724 606.74 165.232 606.248 165.232 605.264V603.296C165.232 602.148 165.724 601.492 166.872 601.164L192.62 593.62C194.096 593.128 195.244 592.8 196.884 592.8C197.868 592.8 198.36 593.456 198.36 594.44V610.184C212.956 593.62 226.24 590.176 236.408 590.176C254.776 590.176 268.88 601.164 268.88 622.32V667.584C268.88 674.636 273.308 677.26 278.228 677.26H283.968C284.952 677.26 285.608 677.916 285.608 678.9V681.36C285.608 682.344 284.952 683 283.968 683H235.752C234.768 683 234.112 682.344 234.112 681.36V678.9C234.112 677.916 234.768 677.26 235.752 677.26H241.492C246.248 677.26 250.84 674.636 250.84 667.584V625.6C250.84 610.348 241.656 602.312 229.356 602.312C219.188 602.312 209.184 606.74 198.36 620.188V667.584Z","M610.48 676.46C583.092 676.46 561.608 657.272 561.608 628.736C561.608 600.2 583.092 581.176 610.48 581.176C637.868 581.176 659.188 600.2 659.188 628.736C659.188 657.272 637.868 676.46 610.48 676.46ZM613.268 669.244C630.488 669.244 640.492 654.32 640.492 633.328C640.492 613.32 629.832 588.392 607.528 588.392C590.636 588.392 579.976 603.316 579.976 624.964C579.976 644.972 590.8 669.244 613.268 669.244Z","M732.36 329.584C732.36 336.636 736.952 339.26 741.708 339.26H752.532C753.516 339.26 754.172 339.916 754.172 340.9V343.36C754.172 344.344 753.516 345 752.532 345H699.068C698.084 345 697.592 344.344 697.592 343.36V340.9C697.592 339.916 698.084 339.26 699.068 339.26H704.972C709.728 339.26 714.32 336.636 714.32 329.584V275.3C714.32 270.38 712.516 268.74 708.58 268.74H700.708C699.724 268.74 699.232 268.248 699.232 267.264V265.296C699.232 264.148 699.724 263.492 700.872 263.164L726.62 255.62C728.096 255.128 729.244 254.8 730.884 254.8C731.868 254.8 732.36 255.456 732.36 256.44V273.988C742.856 263.328 754.336 253.816 764.832 253.816C770.736 253.816 776.148 256.932 776.148 264.312C776.148 269.068 773.852 273.168 767.784 273.168C761.716 273.168 760.076 269.232 753.188 269.232C746.956 269.232 741.708 272.512 732.36 282.188V329.584Z","M869.248 163.436C869.248 143.264 885.484 135.72 935.996 124.24V109.48C935.996 99.1478 929.108 94.7198 920.744 94.7198C893.52 94.7198 896.8 120.96 881.22 120.96C875.644 120.96 872.036 118.172 872.036 112.76C872.036 99.6398 896.8 87.1758 923.532 87.1758C942.392 87.1758 954.036 94.8838 954.036 112.76V166.388C954.036 170.324 956.004 171.636 958.792 171.636C962.072 171.636 966.5 169.832 969.124 167.7C971.42 166.06 973.716 169.012 972.404 170.816C964.532 181.64 958.956 182.624 952.724 182.624C942.72 182.624 935.996 176.884 935.996 165.24V158.68C923.532 173.768 907.624 182.624 892.864 182.624C879.58 182.624 869.248 175.244 869.248 163.436ZM887.452 158.68C887.452 166.224 892.372 170.816 899.916 170.816C910.248 170.816 924.188 163.6 935.996 148.348V131.62C892.372 141.788 887.452 150.152 887.452 158.68Z","M878.048 427.092C884.936 434.636 892.644 438.736 899.86 438.736C915.604 438.736 931.676 426.108 931.676 401.016C931.676 379.04 920.196 362.804 906.092 362.804C895.924 362.804 887.232 367.068 878.048 377.892V427.092ZM860.008 432.012V340.5C860.008 335.58 858.204 333.94 854.268 333.94H846.396C845.412 333.94 844.92 333.448 844.92 332.464V330.496C844.92 329.348 845.412 328.692 846.56 328.364L872.308 320.82C873.784 320.328 874.932 320 876.572 320C877.556 320 878.048 320.656 878.048 321.64V368.216C887.396 358.376 899.696 350.176 912.816 350.176C932.988 350.176 948.404 369.2 948.404 392.816C948.404 423.484 924.46 445.624 899.86 445.624C887.068 445.624 875.096 443.328 861.156 434.144C860.336 433.488 860.008 432.832 860.008 432.012Z","M797.684 619.172C790.304 619.172 785.056 613.924 785.056 606.544C785.056 599.164 790.304 594.08 797.684 594.08C804.9 594.08 809.984 599.164 809.984 606.544C809.984 613.924 804.9 619.172 797.684 619.172ZM807.36 706.584C807.36 713.636 811.952 716.26 816.708 716.26H822.612C823.596 716.26 824.252 716.916 824.252 717.9V720.36C824.252 721.344 823.596 722 822.612 722H774.068C773.084 722 772.592 721.344 772.592 720.36V717.9C772.592 716.916 773.084 716.26 774.068 716.26H779.972C784.728 716.26 789.32 713.636 789.32 706.584V655.58C789.32 650.66 787.352 649.02 783.58 649.02H775.708C774.724 649.02 774.232 648.528 774.232 647.544V645.576C774.232 644.428 774.56 644.1 775.872 643.444L799.324 633.112C800.636 632.456 802.44 631.8 803.588 631.8H805.884C806.868 631.8 807.36 632.456 807.36 633.44V706.584Z","M1053.56 622.584C1053.56 629.636 1058.15 632.26 1062.9 632.26H1068.81C1069.79 632.26 1070.45 632.916 1070.45 633.9V636.36C1070.45 637.344 1069.79 638 1068.81 638H1020.26C1019.28 638 1018.79 637.344 1018.79 636.36V633.9C1018.79 632.916 1019.28 632.26 1020.26 632.26H1026.17C1030.92 632.26 1035.52 629.636 1035.52 622.584V535.5C1035.52 530.58 1033.71 528.94 1029.78 528.94H1021.9C1020.92 528.94 1020.43 528.448 1020.43 527.464V525.496C1020.43 524.348 1020.92 523.692 1022.07 523.364L1047.82 515.82C1049.29 515.328 1050.44 515 1052.08 515C1053.06 515 1053.56 515.656 1053.56 516.64V622.584Z","M1126.68 193.172C1119.3 193.172 1114.06 187.924 1114.06 180.544C1114.06 173.164 1119.3 168.08 1126.68 168.08C1133.9 168.08 1138.98 173.164 1138.98 180.544C1138.98 187.924 1133.9 193.172 1126.68 193.172ZM1136.36 280.584C1136.36 287.636 1140.95 290.26 1145.71 290.26H1151.61C1152.6 290.26 1153.25 290.916 1153.25 291.9V294.36C1153.25 295.344 1152.6 296 1151.61 296H1103.07C1102.08 296 1101.59 295.344 1101.59 294.36V291.9C1101.59 290.916 1102.08 290.26 1103.07 290.26H1108.97C1113.73 290.26 1118.32 287.636 1118.32 280.584V229.58C1118.32 224.66 1116.35 223.02 1112.58 223.02H1104.71C1103.72 223.02 1103.23 222.528 1103.23 221.544V219.576C1103.23 218.428 1103.56 218.1 1104.87 217.444L1128.32 207.112C1129.64 206.456 1131.44 205.8 1132.59 205.8H1134.88C1135.87 205.8 1136.36 206.456 1136.36 207.44V280.584Z","M1309.74 387.12C1309.74 402.208 1314.98 407.456 1324 407.456C1328.43 407.456 1336.14 405.652 1342.04 400.076C1344.01 398.272 1346.8 399.912 1345.49 402.536C1340.08 413.688 1328.43 417.624 1319.25 417.624C1302.85 417.624 1291.7 408.276 1291.7 390.4V333H1277.76C1275.13 333 1274.15 331.852 1274.15 330.048C1274.15 328.408 1274.64 327.096 1277.76 325.292L1301.86 311.024C1303.83 309.876 1305.96 308.728 1307.11 308.728C1308.59 308.728 1309.74 309.548 1309.74 311.188V324.8H1340.9C1341.88 324.8 1342.54 325.456 1342.54 326.44V332.18C1342.54 332.672 1341.88 333 1340.9 333H1309.74V387.12Z","M1306.12 548.364C1301.53 539.836 1295.3 537.54 1289.88 537.54H1289.72C1289.06 537.54 1288.57 537.048 1288.57 536.392V533.112C1288.57 532.292 1289.06 531.8 1289.72 531.8H1336.13C1336.95 531.8 1337.44 532.292 1337.44 533.112V536.392C1337.44 537.048 1336.95 537.54 1336.13 537.54H1333.34C1326.29 537.54 1322.68 542.296 1326.46 549.676L1351.38 598.056L1377.62 549.348C1381.72 541.804 1375.82 537.54 1370.57 537.54H1369.59C1368.77 537.54 1368.28 537.048 1368.28 536.392V533.112C1368.28 532.292 1368.77 531.8 1369.59 531.8H1402.39C1403.21 531.8 1403.7 532.292 1403.7 533.112V536.392C1403.7 537.048 1403.21 537.54 1402.39 537.54C1396.81 537.54 1391.24 540.492 1387.3 547.872L1342.53 631.84C1332.36 651.028 1316.94 657.588 1304.97 657.424C1294.97 657.424 1289.06 652.996 1289.06 646.436C1289.06 641.516 1293.16 638.072 1298.08 638.072C1304.32 638.072 1310.38 644.96 1316.29 644.96C1325.96 644.96 1336.95 630.364 1336.95 617.408C1336.95 608.552 1334 599.696 1329.24 591.004L1306.12 548.364Z","M1430.67 770.79C1417.14 770.79 1407.64 761.294 1407.64 747.764C1407.64 734.283 1417.14 724.788 1430.67 724.788C1444.15 724.788 1453.64 734.283 1453.64 747.764C1453.64 761.294 1444.15 770.79 1430.67 770.79ZM1430.67 768.084C1442.08 768.084 1450.2 759.67 1450.2 747.764C1450.2 735.858 1442.08 727.494 1430.67 727.494C1419.25 727.494 1411.08 735.858 1411.08 747.764C1411.08 759.67 1419.25 768.084 1430.67 768.084ZM1426.34 746.042C1427.47 746.239 1428.65 746.386 1429.63 746.386C1433.37 746.386 1436.18 746.19 1436.18 742.303C1436.18 738.711 1433.77 737.481 1430.47 737.481C1428.9 737.481 1427.67 737.678 1426.34 738.121V746.042ZM1422.01 739.105C1422.01 737.678 1421.12 737.186 1420.14 737.186H1419.01C1418.81 737.186 1418.66 737.038 1418.66 736.842V735.907C1418.66 735.71 1418.81 735.562 1419.01 735.562H1430.17C1435.39 735.562 1440.56 736.94 1440.56 742.254C1440.56 746.534 1437.01 747.912 1433.32 748.305L1438.74 753.963C1440.46 755.784 1441.44 756.374 1443.36 756.374C1443.51 756.374 1443.61 756.472 1443.61 756.669V757.653C1443.61 757.85 1443.46 757.998 1443.26 757.998H1438.05C1436.77 757.998 1435.83 757.407 1435.09 756.374L1430.57 750.421C1429.14 748.551 1428.21 748.01 1426.34 747.813V754.455C1426.34 755.882 1427.22 756.374 1428.21 756.374H1429.34C1429.53 756.374 1429.63 756.522 1429.63 756.718V757.653C1429.63 757.85 1429.53 757.998 1429.34 757.998H1419.01C1418.81 757.998 1418.66 757.85 1418.66 757.653V756.718C1418.66 756.522 1418.81 756.374 1419.01 756.374H1420.14C1421.12 756.374 1422.01 755.882 1422.01 754.455V739.105Z"],
  lines: [{"x1":164.815,"y1":170.42,"x2":206.815,"y2":229.42,"e1":0,"e2":1},{"x1":343.31,"y1":237.068,"x2":390.31,"y2":192.276,"e1":1,"e2":2},{"x1":473.879,"y1":199.523,"x2":531.059,"y2":305.008,"e1":2,"e2":3},{"x1":444.6,"y1":460.8,"x2":280.6,"y2":583.8,"e1":3,"e2":4},{"x1":533.164,"y1":635.986,"x2":311.164,"y2":672.986,"e1":5,"e2":4},{"x1":688.958,"y1":366.288,"x2":629.958,"y2":562.288,"e1":6,"e2":5},{"x1":858.671,"y1":128.741,"x2":742.671,"y2":233.741,"e1":7,"e2":6},{"x1":928.916,"y1":199.402,"x2":885.916,"y2":297.402,"e1":7,"e2":8},{"x1":895.789,"y1":466.615,"x2":810.789,"y2":575.615,"e1":8,"e2":9},{"x1":996.473,"y1":634.881,"x2":845.473,"y2":715.881,"e1":10,"e2":9},{"x1":1088.98,"y1":318.194,"x2":1054.98,"y2":490.194,"e1":11,"e2":10},{"x1":1246.7,"y1":321.954,"x2":1176.7,"y2":299.954,"e1":12,"e2":11},{"x1":1341.06,"y1":500.33,"x2":1320.06,"y2":440.33,"e1":13,"e2":12},{"x1":1401.24,"y1":718.649,"x2":1349.24,"y2":657.649,"e1":14,"e2":13}]
};

/* ---- The simulation ---- */
(window.enigmaReady || function (f) { f(); })(function () {
  (function kineticLetters() {
    if (!window.gsap || !window.CONSTEL) return;
    var hosts = document.querySelectorAll(".al-constel");
    if (!hosts.length) return;

    // Exact Figma glyph vectors (frame 1494 x 799.4): 15 paths + 14 bonds threading them in
    // reading order (U-n-i-g-n-o-r-a-b-i-l-i-t-y-(R)).
    var FW = 1494, FH = 799.4, HITPAD = 16, NS = "http://www.w3.org/2000/svg";

    // --- Physics tuning (frame units / seconds) --------------------------------------------
    // Everything below is a REAL simulation -- the letters are damped point-mass springs, the
    // bands are verlet ropes pinned behind them. Nothing is keyframed except the intro's
    // TARGETS; all visible motion (overshoot, wobble, sag, stretch, ring-down) emerges from
    // the integration.
    var SPRING_K    = 150,    // glyph spring stiffness toward its target (home or scatter spot)
        SPRING_ZETA = 1.0,    // critically damped: letters glide to a stop, NO bounce -- the visible
                              // wobble on a landing lives entirely in the bands' leftover momentum
        TENSION_K   = 4.0,    // taut-band tug on the letters it joins -- dragging one letter leans
                              // its neighbours slightly inward, nothing else moves
        GRAV        = 2200,   // rope gravity -- the dangle
        ROPE_DAMP   = 0.985,  // rope energy retention -- higher = wobblier, longer ring-down
        ROPE_ITER   = 5,      // constraint passes per step -- fewer = stretchier, more elastic
        ROPE_PTS    = 12,     // particles per strand
        MARGIN      = 60,     // intro scatter keeps letter centres this far inside the frame
        BOUND       = 200,    // how far outside the frame a dragged letter may travel
        DT          = 1 / 60, MAX_STEPS = 3, // fixed-substep integration, stable at any refresh rate
        PALETTE     = ["#ff9eed", "#ff0008", "#ffff83", "#00e592"], // brand pink / red / yellow / green -- no blue
        READ_HOLD   = 1.0,    // seconds the plain word holds before the first jump
        JUMP_PERIOD = 1.1,    // seconds per intro round -- the springs do the actual moving
        HOVER_KICK  = 1500;   // pluck impulse (units/s) a hovered band gets -- rubber-band twang

    var PATHS = window.CONSTEL.paths, LINES = window.CONSTEL.lines;
    // Exact Figma glyph bounding boxes [x,y,w,h] (get_metadata) -> padded invisible grab handles,
    // and the source of each glyph's own width/height for the reading layout below.
    var BBOX = [
      [42.704, 46.2, 135.3, 117.096], [217.592, 236.176, 122.016, 92.824], [413.592, 44.08, 51.66, 127.92],
      [468.28, 318.368, 105.944, 139.564], [163.592, 590.176, 122.016, 92.824], [561.608, 581.176, 97.58, 95.284],
      [697.592, 253.816, 78.556, 91.184], [869.248, 87.176, 103.539, 95.448], [844.92, 320, 103.484, 125.624],
      [772.592, 594.08, 51.66, 127.92], [1018.788, 515, 51.66, 123], [1101.592, 168.08, 51.66, 127.92],
      [1274.148, 308.728, 71.679, 108.896], [1288.572, 531.8, 115.128, 125.627], [1407.641, 724.788, 46.002, 46.002]
    ];
    // READING LAYOUT -- "Unignorability" set out on one normal baseline, in reading order. This
    // is HOME: the pose the section opens on, the pose the intro returns to, and the pose the
    // springs pull every letter back to after a drag. Baselines re-derived from each glyph's own
    // bbox: normal letters sit bbox-bottom on the baseline, the two descenders (g, y) hang
    // DESCENT below it, and the trailing (R) mark rides as a raised superscript.
    var DESCENDERS = [3, 13], SUPER_IDX = 14, DESCENT = 39, LETTER_GAP = 6, SUPER_RISE = 60;
    var READ = (function () {
      var baseline = FH * 0.5 + 30, totalW = 0, i;
      for (i = 0; i < BBOX.length; i++) totalW += BBOX[i][2] + (i < BBOX.length - 1 ? LETTER_GAP : 0);
      var cx = (FW - totalW) / 2, pos = [];
      for (i = 0; i < BBOX.length; i++) {
        var bw = BBOX[i][2], bh = BBOX[i][3], y;
        if (i === SUPER_IDX) y = baseline - SUPER_RISE - bh / 2;
        else if (DESCENDERS.indexOf(i) !== -1) y = baseline + DESCENT - bh / 2;
        else y = baseline - bh / 2;
        pos.push({ x: cx + bw / 2, y: y });
        cx += bw + LETTER_GAP;
      }
      return pos;
    })();
    // TIE-ON POINTS. Bands don't vanish behind the middle of each letter -- each strand ties onto
    // the letterform at its OWN random spot (three strands reaching an "i" might hit the dot, the
    // middle of the stem and the foot), so the points are spread across every letter, different
    // every load. CRITICAL: the point must sit ON the letter's INK -- a bbox contains counters
    // and bare canvas (inside the U's bowl, beside the r's arm), and an end cap landing there
    // shows as a visible rope end. So rejection-sample against the actual path geometry
    // (isPointInFill), requiring `pad` of clearance in all four directions so the strand's round
    // cap stays fully covered by the white letterform.
    var PT_SCRATCH = document.createElementNS(NS, "svg").createSVGPoint(); // isPointInFill wants a legacy SVGPoint
    function sampleInk(pathEl, bb, wantPad) {
      var pt = PT_SCRATCH, x, y, t, o, ok;
      // Thin glyphs (the (R) mark's ring) can't hide a fat cap -- step the clearance down and
      // report what was achieved; the caller slims the strand to match.
      var pads = [wantPad, wantPad * 0.6, wantPad * 0.35, 2, 1];
      for (var pi = 0; pi < pads.length; pi++) {
        var pad = pads[pi];
        var offs = [[pad, 0], [-pad, 0], [0, pad], [0, -pad]];
        for (t = 0; t < 90; t++) {
          x = bb[0] + (0.05 + Math.random() * 0.9) * bb[2];
          y = bb[1] + (0.03 + Math.random() * 0.94) * bb[3];
          pt.x = x; pt.y = y;
          if (!pathEl.isPointInFill(pt)) continue;
          ok = true;
          for (o = 0; o < 4 && ok; o++) {
            pt.x = x + offs[o][0]; pt.y = y + offs[o][1];
            if (!pathEl.isPointInFill(pt)) ok = false;
          }
          if (ok) return { x: x, y: y, pad: pad };
        }
      }
      // Last resort: a point on the outline (should never happen with the pad ladder above).
      var L = pathEl.getTotalLength();
      var p2 = pathEl.getPointAtLength(Math.random() * L);
      return { x: p2.x, y: p2.y, pad: 0.5 };
    }
    var constels = [];

    /* AD 2026-07-30 -- letters must scatter to the EDGE of the container.
       (An earlier pass used preserveAspectRatio="none" to fill the box; that stretched the
       glyphs and looked wrong. Reverted -- the fit stays uniform.)

       The real problem was the coordinate space, not the fit. The viewBox was the fixed Figma
       frame (1494x799.4, aspect 1.87). Under "meet" that renders letterboxed inside the cell,
       so on a phone cell (504x450, aspect 1.12) there were ~90px dead bands top and bottom that
       are OUTSIDE the viewBox entirely -- no scatter target could ever reach the container edge,
       because those pixels aren't addressable in frame units.

       So the viewBox is now computed from the cell's own aspect: extend it on whichever axis is
       short, keeping the word centred. Scale stays uniform (no distortion), the viewBox covers
       the whole cell, and scatter/drag bounds derive from it -- so letters genuinely reach the
       edges. Desktop is a no-op in practice: its cell is 1.784 vs the frame's 1.869, an 18px
       band. */
    function fitViewBox(con) {
      var r = con.el.getBoundingClientRect();
      var hostAspect = (r.width / r.height) || (FW / FH);
      var w = FW, h = FH;
      if (hostAspect > FW / FH) w = FH * hostAspect;   // cell wider than the frame -> widen it
      else h = FW / hostAspect;                        // cell taller -> heighten it
      var x = (FW - w) / 2, y = (FH - h) / 2;          // keep the word centred in the new box
      con.vb = { x: x, y: y, w: w, h: h };
      con.svg.setAttribute("viewBox", x + " " + y + " " + w + " " + h);
    }

    // px per frame-unit. Uniform again now the viewBox matches the cell's aspect.
    function curScale(con) {
      var r = con.el.getBoundingClientRect();
      return (r.width / (con.vb ? con.vb.w : FW)) || 1;
    }

    hosts.forEach(function (host) {
      var con = { el: host, svg: null, vb: null, glyphs: null, bonds: null, introActive: false, introCalls: [] };
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 " + FW + " " + FH);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      svg.setAttribute("class", "al-constel-svg");
      host.appendChild(svg);
      con.svg = svg;
      fitViewBox(con);        // widen/heighten the box to the cell so scatter can reach the edges

      // Bands first so every strand paints BEHIND the letterforms -- the rope ends terminate at
      // the glyph centres, so they visually disappear behind the letters rather than floating.
      // Each band = 2-3 verlet-rope strands with their own random thickness and slack, plus an
      // invisible fat hit-path for the hover wobble.
      var bonds = LINES.map(function (L, bi) {
        var hit = document.createElementNS(NS, "path");
        hit.setAttribute("class", "al-bond-hit");
        svg.appendChild(hit);
        var nStr = 2 + (Math.random() < 0.65 ? 1 : 0);
        var strands = [];
        for (var k = 0; k < nStr; k++) {
          var el = document.createElementNS(NS, "path");
          el.setAttribute("class", "al-strand");
          el.setAttribute("stroke", PALETTE[(bi + k) % PALETTE.length]);
          var w = 4.5 + Math.random() * 8.5;                  // varied weight
          el.setAttribute("stroke-width", w.toFixed(1));
          svg.appendChild(el);
          // Tie-on points + rope particles are filled in AFTER the glyphs exist (tieStrands
          // below) -- ink sampling needs the glyph <path> geometry, which isn't built yet.
          strands.push({ el: el, w: w, pts: null, segLen: 0, aA: null, aB: null });
        }
        // Band rest length (for the letter-tug) works off the glyph centres, anchor-agnostic.
        var centerD = Math.hypot(READ[L.e2].x - READ[L.e1].x, READ[L.e2].y - READ[L.e1].y);
        var bond = { def: L, hitEl: hit, strands: strands, rest: centerD * 1.15 };
        // Hover = a PLUCK: one coherent perpendicular impulse, strongest mid-span (a plucked
        // rubber band's first mode), then the sim rings it down on its own.
        hit.addEventListener("pointerenter", function () {
          if (con.glyphs && con.glyphs.some(function (s) { return s.dragging; })) return;
          var sgn = Math.random() < 0.5 ? -1 : 1;
          for (var s = 0; s < strands.length; s++) {
            var P = strands[s].pts, n = P.length;
            var ddx = P[n - 1].x - P[0].x, ddy = P[n - 1].y - P[0].y;
            var dd = Math.hypot(ddx, ddy) || 1;
            var nxp = -ddy / dd, nyp = ddx / dd;               // perpendicular to the band
            var amp = HOVER_KICK * (0.7 + Math.random() * 0.6) * sgn;
            for (var q = 1; q < n - 1; q++) {
              var f = Math.sin(Math.PI * q / (n - 1));
              P[q].ox = P[q].x - nxp * amp * f * DT;
              P[q].oy = P[q].y - nyp * amp * f * DT;
            }
          }
        });
        return bond;
      });

      // Glyphs: each is a <g> carrying its exact path, transform-offset from where the path
      // natively sits (px,py) to wherever the simulation puts it (x,y).
      var glyphs = PATHS.map(function (d, idx) {
        var g = document.createElementNS(NS, "g");
        g.setAttribute("class", "al-glyph");
        var bb = BBOX[idx];
        var hit = document.createElementNS(NS, "rect");
        hit.setAttribute("class", "al-hit");
        hit.setAttribute("x", bb[0] - HITPAD); hit.setAttribute("y", bb[1] - HITPAD);
        hit.setAttribute("width", bb[2] + HITPAD * 2); hit.setAttribute("height", bb[3] + HITPAD * 2);
        hit.setAttribute("rx", 8);
        g.appendChild(hit);
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        g.appendChild(p);
        svg.appendChild(g);
        var st = {
          el: g, pathEl: p, px: bb[0] + bb[2] / 2, py: bb[1] + bb[3] / 2,
          hx: READ[idx].x, hy: READ[idx].y,
          x: READ[idx].x, y: READ[idx].y,
          vx: 0, vy: 0, fx: 0, fy: 0,
          jx: null, jy: null,                  // intro scatter target override (null = home)
          bw: bb[2], bh: bb[3], dragging: false
        };
        // Drag: ONLY this letter pins to the cursor. Everything else stays planted on its home
        // spring -- taut bands lean the two neighbours slightly inward via TENSION_K, no chain.
        g.addEventListener("pointerdown", function (e) {
          e.preventDefault();
          cancelIntro(con);                    // clear scatter targets; springs carry letters home
          st.dragging = true;
          st.cx = e.clientX; st.cy = e.clientY;
          st.gx = st.x; st.gy = st.y;
          st.tgx = st.x; st.tgy = st.y;
          st.scaleAt = curScale(con);
          g.classList.add("is-grabbing");
          try { g.setPointerCapture(e.pointerId); } catch (err) {}
        });
        g.addEventListener("pointermove", function (e) {
          if (!st.dragging) return;
          var s = st.scaleAt || 1;
          st.tgx = st.gx + (e.clientX - st.cx) / s;
          st.tgy = st.gy + (e.clientY - st.cy) / s;
        });
        var release = function () {
          if (!st.dragging) return;
          st.dragging = false;                 // the spring takes it home -- the rubber-band snap
          g.classList.remove("is-grabbing");
        };
        g.addEventListener("pointerup", release);
        g.addEventListener("pointercancel", release);
        return st;
      });

      // Tie every strand end to its own random point ON the letter ink (never bare canvas or a
      // counter), then build its rope off those points. Runs after the glyph <path>s exist.
      bonds.forEach(function (bond) {
        var e1 = bond.def.e1, e2 = bond.def.e2;
        bond.strands.forEach(function (sd) {
          var pad = sd.w / 2 + 2;
          var pA = sampleInk(glyphs[e1].pathEl, BBOX[e1], pad);
          var pB = sampleInk(glyphs[e2].pathEl, BBOX[e2], pad);
          // If either letter couldn't offer full clearance (thin ink), slim the strand so its
          // round end caps still hide completely behind the letterform.
          var got = Math.min(pA.pad, pB.pad);
          if (got < pad) {
            sd.w = Math.max(2.5, (got - 1) * 2);
            sd.el.setAttribute("stroke-width", sd.w.toFixed(1));
          }
          sd.aA = { ox: pA.x - glyphs[e1].px, oy: pA.y - glyphs[e1].py };
          sd.aB = { ox: pB.x - glyphs[e2].px, oy: pB.y - glyphs[e2].py };
          var ax0 = READ[e1].x + sd.aA.ox, ay0 = READ[e1].y + sd.aA.oy;
          var bx0 = READ[e2].x + sd.aB.ox, by0 = READ[e2].y + sd.aB.oy;
          var homeD = Math.hypot(bx0 - ax0, by0 - ay0);
          var slack = 1.06 + Math.random() * 0.38;            // each strand hangs its own amount
          sd.segLen = homeD * slack / (ROPE_PTS - 1);
          sd.pts = [];
          for (var p = 0; p < ROPE_PTS; p++) {
            var f = p / (ROPE_PTS - 1);
            var sx = ax0 + (bx0 - ax0) * f;
            var sy = ay0 + (by0 - ay0) * f
                   + Math.sin(Math.PI * f) * homeD * (slack - 1) * 0.9;  // seeded pre-sagged
            sd.pts.push({ x: sx, y: sy, ox: sx, oy: sy });     // ox/oy = previous position (verlet)
          }
        });
      });

      con.glyphs = glyphs; con.bonds = bonds;
      constels.push(con);
      // The cell's aspect changes with the viewport, so the box has to be refitted or the
      // scatter bounds go stale (letters would either stop short or overshoot the cell).
      window.addEventListener("resize", function () { fitViewBox(con); });

      // Intro: at 70%-in-view the FIRST frame is the plain word at rest (letters already sit at
      // home, strands dangling). Hold a beat, spring-jump to a few random scatters, then spring
      // back to the word -- and only then is it draggable. Replays on every re-entry.
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && !con.introActive) runIntro(con);
      }, { threshold: 0.7 });
      io.observe(host);
    });

    function cancelIntro(con) {
      con.introCalls.forEach(function (h) { h.kill(); });
      con.introCalls.length = 0;
      con.glyphs.forEach(function (s) { s.jx = null; s.jy = null; });
      con.introActive = false;
    }

    function runIntro(con) {
      con.introActive = true;
      con.introCalls.push(gsap.delayedCall(READ_HOLD, function () { jumpRounds(con); }));
    }

    function jumpRounds(con) {
      var G = con.glyphs, rounds = Math.random() < 0.5 ? 3 : 4, r = 0;
      (function next() {
        r++;
        var last = r > rounds;                 // after `rounds` scatters, the final round is home
        G.forEach(function (st) {
          if (last) { st.jx = null; st.jy = null; }
          else {
            // Scatter across the CELL, not the original frame -- con.vb is the frame widened or
            // heightened to the cell's aspect, so on a phone these targets reach the top and
            // bottom edges instead of stopping ~90px short inside a letterboxed frame.
            var vb = con.vb || { x: 0, y: 0, w: FW, h: FH };
            st.jx = gsap.utils.random(vb.x + MARGIN, vb.x + vb.w - MARGIN);
            st.jy = gsap.utils.random(vb.y + MARGIN, vb.y + vb.h - MARGIN);
          }
        });
        if (last) con.introCalls.push(gsap.delayedCall(JUMP_PERIOD, function () { con.introActive = false; }));
        else con.introCalls.push(gsap.delayedCall(JUMP_PERIOD, next));
      })();
    }

    // One fixed-DT physics step: integrate the letter springs, apply taut-band tension, then
    // step every rope.
    function step(con) {
      var G = con.glyphs, i, st;
      var C = 2 * Math.sqrt(SPRING_K) * SPRING_ZETA;   // damping from the ratio, not hand-tuned
      for (i = 0; i < G.length; i++) {
        st = G[i];
        if (st.dragging) {
          // Clamp against the CELL box (con.vb) rather than the raw frame, so a drag has the
          // same reach as the scatter does on a tall phone cell.
          var vbc = con.vb || { x: 0, y: 0, w: FW, h: FH };
          var nx = Math.max(vbc.x - BOUND, Math.min(vbc.x + vbc.w + BOUND, st.tgx));
          var ny = Math.max(vbc.y - BOUND, Math.min(vbc.y + vbc.h + BOUND, st.tgy));
          st.vx = (nx - st.x) / DT; st.vy = (ny - st.y) / DT; // real velocity so ropes inherit the throw
          st.x = nx; st.y = ny;
        } else {
          var txx = st.jx !== null ? st.jx : st.hx;
          var tyy = st.jy !== null ? st.jy : st.hy;
          var ax = SPRING_K * (txx - st.x) - C * st.vx + st.fx;
          var ay = SPRING_K * (tyy - st.y) - C * st.vy + st.fy;
          st.vx += ax * DT; st.vy += ay * DT;
          st.x += st.vx * DT; st.y += st.vy * DT;
        }
        st.fx = 0; st.fy = 0;
      }
      // Bands stretched past their rest length tug their two letters toward each other a little.
      for (i = 0; i < con.bonds.length; i++) {
        var bd = con.bonds[i], A = G[bd.def.e1], B = G[bd.def.e2];
        var dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.0001;
        if (d > bd.rest) {
          var f = TENSION_K * (d - bd.rest), ux = dx / d, uy = dy / d;
          A.fx += f * ux; A.fy += f * uy;
          B.fx -= f * ux; B.fy -= f * uy;
        }
      }
      // Each strand pins to its OWN tie-on points, riding the two letters' transforms.
      for (i = 0; i < con.bonds.length; i++) {
        var bd2 = con.bonds[i], A2 = G[bd2.def.e1], B2 = G[bd2.def.e2];
        for (var s = 0; s < bd2.strands.length; s++) {
          var sd = bd2.strands[s];
          ropeStep(sd, A2.x + sd.aA.ox, A2.y + sd.aA.oy, B2.x + sd.aB.ox, B2.y + sd.aB.oy);
        }
      }
    }

    // Verlet rope: integrate interior particles under gravity, pin the ends behind the two
    // letters, then relax the segment-length constraints. Slack shows as sag; anchors pulled
    // apart faster than the constraints can absorb shows as elastic stretch; leftover momentum
    // shows as the wobble that rings down after a landing -- all emergent, none scripted.
    function ropeStep(strand, ax, ay, bx, by) {
      var P = strand.pts, n = P.length, q, pt;
      for (q = 1; q < n - 1; q++) {
        pt = P[q];
        var nx = pt.x + (pt.x - pt.ox) * ROPE_DAMP;
        var ny = pt.y + (pt.y - pt.oy) * ROPE_DAMP + GRAV * DT * DT;
        pt.ox = pt.x; pt.oy = pt.y;
        pt.x = nx; pt.y = ny;
      }
      P[0].x = ax; P[0].y = ay; P[n - 1].x = bx; P[n - 1].y = by;
      for (var it = 0; it < ROPE_ITER; it++) {
        for (q = 0; q < n - 1; q++) {
          var a = P[q], b = P[q + 1];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d = Math.hypot(dx, dy) || 0.0001;
          var diff = (d - strand.segLen) / d * 0.5;
          var mx = dx * diff, my = dy * diff;
          if (q === 0) { b.x -= mx * 2; b.y -= my * 2; }                    // end pinned: partner takes it all
          else if (q === n - 2) { a.x += mx * 2; a.y += my * 2; }
          else { a.x += mx; a.y += my; b.x -= mx; b.y -= my; }
        }
        P[0].x = ax; P[0].y = ay; P[n - 1].x = bx; P[n - 1].y = by;
      }
    }

    function pathFor(P) {
      var d = "M" + P[0].x.toFixed(1) + " " + P[0].y.toFixed(1), i;
      for (i = 1; i < P.length - 1; i++) {
        var mx = (P[i].x + P[i + 1].x) / 2, my = (P[i].y + P[i + 1].y) / 2;
        d += " Q" + P[i].x.toFixed(1) + " " + P[i].y.toFixed(1) + " " + mx.toFixed(1) + " " + my.toFixed(1);
      }
      return d + " L" + P[P.length - 1].x.toFixed(1) + " " + P[P.length - 1].y.toFixed(1);
    }

    function render() {
      var steps = Math.max(1, Math.min(MAX_STEPS, Math.round(gsap.ticker.deltaRatio(60))));
      for (var c = 0; c < constels.length; c++) {
        var con = constels[c];
        if (con.el.offsetParent === null) continue; // skip hidden tabs
        for (var k = 0; k < steps; k++) step(con);
        var G = con.glyphs, i;
        for (i = 0; i < G.length; i++) {
          var st = G[i];
          st.el.setAttribute("transform", "translate(" + (st.x - st.px) + " " + (st.y - st.py) + ")");
        }
        for (i = 0; i < con.bonds.length; i++) {
          var bd = con.bonds[i];
          for (var s = 0; s < bd.strands.length; s++) {
            bd.strands[s].el.setAttribute("d", pathFor(bd.strands[s].pts));
          }
          bd.hitEl.setAttribute("d", pathFor(bd.strands[0].pts));
        }
      }
    }
    gsap.ticker.add(render);
    render();
    // QA hook: rAF (and so gsap.ticker) is throttled in unfocused/automated tabs, so the sim
    // can't be verified by idle screenshots. This lets a test drive it deterministically.
    window.__ROPE = {
      constels: constels, step: step, render: render,
      tune: function (o) {
        if (o.springK !== undefined) SPRING_K = o.springK;
        if (o.zeta !== undefined) SPRING_ZETA = o.zeta;
        if (o.tensionK !== undefined) TENSION_K = o.tensionK;
        if (o.grav !== undefined) GRAV = o.grav;
        if (o.ropeDamp !== undefined) ROPE_DAMP = o.ropeDamp;
        if (o.ropeIter !== undefined) ROPE_ITER = o.ropeIter;
        if (o.hoverKick !== undefined) HOVER_KICK = o.hoverKick;
        if (o.readHold !== undefined) READ_HOLD = o.readHold;
        if (o.jumpPeriod !== undefined) JUMP_PERIOD = o.jumpPeriod;
        return { springK: SPRING_K, zeta: SPRING_ZETA, tensionK: TENSION_K, grav: GRAV,
                 ropeDamp: ROPE_DAMP, ropeIter: ROPE_ITER, hoverKick: HOVER_KICK,
                 readHold: READ_HOLD, jumpPeriod: JUMP_PERIOD };
      }
    };
  })();
});
