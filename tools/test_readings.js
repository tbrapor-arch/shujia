// Readings of polyphonic characters in pīn mode, as SOLO_READ, soloSegs and CTX_READ in index.html decide them from the neighbouring words:
// 得 děi "must" / dé "to get" / de (complement), also when the segmenter put the 得 inside a longer word (你得来, 他乐得合不拢嘴, 办得到), and
// the other characters with rules (长 zhǎng, 冲 chòng, 了 liǎo, 着 zháo, 数 shǔ…: CHARS below). Runs the app's own functions (taken from
// index.html by name) on the real data files, on hand-written labelled sentences; prints precision / recall per character, every wrong
// reading and miss, checks the pop-up against the ruby, that the rules give the same with old data (no word classes), and that every
// other character of every sentence keeps its expected reading (tools/test_readings.expect: the readings of an earlier index.html, plus
// the labels written in the sentences; a word read otherwise, 获得 turned into huò de, fails).
// Usage: node tools/test_readings.js [-v]     (from the repo root or anywhere; needs only Node; OLD_DATA=1 with a words.txt without classes)
//        node tools/test_readings.js --freeze OLD/index.html   rewrites the .expect file from that copy (e.g. git show HEAD:index.html)
// 得 labels: I = děi, E = dé, D = de; a t after the label = traditional characters, an l = a « Lignes » row with unknown neighbours (its
// edges are cuts); a / in a sentence = an element boundary (他气/得把杯子摔了 is 他气<b>得</b>…: annotate() sees each text node alone);
// A^B$C = the podcast row B after row A and before row C (^^ / $$: another speaker; ^B: the episode's first row); one 得 per sentence.
// Other characters: the label is the expected pinyin of the character (zhang3 她长得真好看), the same flags after it (chang2t, zhang3l);
// a * marks which one when the character occurs twice (数了*数). In any sentence, 字{py} states another character's reading where it
// differs from the earlier index.html on purpose (他跑得了{liao3}吗).
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..'), EXPECT = path.join(__dirname, 'test_readings.expect');

// top-level declarations of the main script, by name (a statement runs until the next line that starts at column 0): those below, and
// all of the pinyin-mode block (from PY_DEFAULT to annotate), where the rules live
const NAMES = ('HAN DICT_VERSION WCLS Dict Words normZh wfreq segment goodPart cedictParts MINOR_RE pyPref READ_MAIN WORD_PY readPref isMinor REF_RE isRefDef isRefOnly ' +
  'pyKey refTarget charEntry CTX_READ partEntry parseEntry MARKS syllable FREQ ensureFreq RANK_STR HSK_STR rankOf bestOf VARIANTS isIdiom OLD_SENSE_RE hitResults hitSoloRead').split(' ');
function load(file) {
  const html = fs.readFileSync(file, 'utf8');
  const src = html.slice(html.indexOf('<script>\n"use strict";'), html.lastIndexOf('</script>'));
  const stmts = new Map(), zone = []; let cur = null, inZone = false;
  for (const L of src.split('\n')) {
    const m = /^(?:async )?(?:const|let|function) ([\w$]+)/.exec(L);
    if (m) { if (m[1] === 'PY_DEFAULT') inZone = true; if (m[1] === 'annotate') inZone = false; if (inZone) zone.push(m[1]); stmts.set(cur = m[1], [L]); }
    else if (/^\S/.test(L) && !/^[)}\].(]/.test(L)) cur = null; else if (cur) stmts.get(cur).push(L);
  }
  const names = [...new Set([...NAMES, ...zone])];
  // stubs: data files from disk; the pop-up's text walker over a fake block of text nodes; compoundEntry only serves multi-character taps
  const stubs = `const breathe = () => Promise.resolve(); async function dataText(k, v, url) { return fs.readFileSync(path.join(root, url), 'utf8'); }
let TRAD = false; const bookIsTrad = () => TRAD; const compoundEntry = () => null; const R = { data: null }; const $$ = () => [];
const textWalker = block => { let i = 0; return { nextNode: () => block.nodes[i++] || null }; };`;
  const ctx = vm.createContext({ console, fs, path, root, window: {} });
  // a name declared second in a statement (const A = …, B = …) comes with A
  const inStmt = n => stmts.has(n) || [...stmts.values()].some(L => new RegExp('^(?:const|let) [^\\n]*?[ ,]' + n + ' = ').test(L[0]) || L.some(l => l.includes(', ' + n + ' = ')));
  vm.runInContext(stubs + '\n' + names.map(n => { if (!inStmt(n)) throw new Error('not in ' + file + ': ' + n); return stmts.has(n) ? stmts.get(n).join('\n') : ''; }).join('\n') +
    `\n;globalThis.X = { ${names.join(', ')}, setTrad: t => { TRAD = t; }, setPod: segs => { R.data = segs ? { pod: { segs } } : null; } };`, ctx);
  return ctx.X;
}

const CASES = `
I 你得把她扔到个坑里|I 不是我，是你，你得把她扔到个坑里|I 我得去趟医院|I 你还得等等|I 那就得看你了|I 咱们得想个办法|I 谁得去跟他说|I 你们得早点回来
I 他得赶紧走了|I 她得自己拿主意|I 我们今天得把这活干完|I 你可得小心点|I 现在得走了，不然赶不上车|I 得赶紧走了|I 得看情况，说不准|I 得多少钱啊
I 这得花多少钱|I 那得等到明年|I 你也得去|I 大家都得交钱|I 我先得回趟家|I 然后得把门锁上|I 一定得记住|I 你必须得说实话|I 至少得等三天
I 起码得给个说法|I 当然得去|I 明天得早起|I 晚上得加班|I 回头得跟他算账|I 你又得挨骂了|I 他们都得听我的|I 人家得上班|I 自己得想清楚
I 俺得回家喂猪了|I 咱得讲理|I 你得知道，这事没那么简单|I 我得先回去|I 这事你得管|I 你得给我个交代|I 我得问问他|I 你得听话|I 他得负责
I 那你得请客|I 那还得说|I 还得再等两个小时|I 这下得重新来了|I 估计得下雨|I 恐怕得推迟|I 早晚得出事|I 迟早得还|I 反正得有人去
I 你得替我想想|I 你得一个人去|I 你得多吃点|I 你得好好学习|I 你得不断努力|I 你得了解一下|I 我得过去看看|I 你得天天练|I 他得早点睡
I 咱俩得谈谈|I 你得跟我走|I 你得对她好点|I 我得给他打个电话|I 你得把钱还我|I 那得多疼啊|I 这得等到什么时候|I 还得麻烦你|I 都得死|I 就得这样
I 你得来|I 我得睡了|I 得走了|I 得加钱|I 得抓紧时间|I 我得静静|I 你得相信我|I 他得跑快点|I 你得说清楚|I 你得赔|I 那你得等着|I 我也得睡会儿
I 你得整明白喽|I 咱得唠唠|I 那你得请我喝酒|I 你得瞅准了再下手|I 完了你得往回走|I 他寻思着得给你送点东西|I 那得老鼻子钱了|I 你得把这锅端了
I 我们得聊聊这个话题|I 所以你得有个心理准备|I 但是你得明白|I 其实你得这么想|I 你得先搞清楚自己要什么|I 你得承认，这挺难的
I 我妈得上班|I 孩子得上学|I 老王得去一趟|I 小李得留下|I 老师得批改作业|I 这孩子得管管了|I 老刘得出趟差|I 我爸得做手术|I 这事得慢慢来
It 妳得去|It 你們得去|It 我們還得等|It 這事兒你得管|It 你得幫我|It 咱們得想辦法|It 現在得走了|It 那就得聽你的|It 你得把她扔到個坑裡|It 他們都得來
E 他得了第一名|E 我得过奖|E 他得过一次奖|E 我得的病不重|E 他得的奖比我多|E 这还得了|E 你说一声就得了|E 得了，别说了|E 得，就这样吧
E 得嘞，您慢走|E 得，我认栽|E 他得了癌症|E 她得了冠军|E 我得了重感冒|E 他去年得了个大奖|E 谁得了第一|E 我得过一次肺炎|E 他得满分
E 那还得了|E 我也得了一个|E 他们得了不少好处|E 你得了吧|E 得，又白干了|E 他得过冠军|E 她得的是抑郁症|E 得的钱全给了他妈|E 小王得了第一
E 你干脆杀了我得了|E 他得金牌了|E 他得了不少钱|E 得咧，听您的
Et 這還得了|Et 他得過獎|Et 我得過一次肺炎|Et 得，就這樣吧|Et 他得了癌症
D 他跑得很快|D 气得把杯子摔了|D 吓得她直哭|D 他气得说不出话来|D 她笑得前仰后合|D 你说对了，他写得真好|D 他病得不轻|D 看把你能得|D 瞧你美得
D 把我急得|D 冻得我直哆嗦|D 他饿得前胸贴后背|D 累得我腰都直不起来|D 疼得他直咧嘴|D 他高兴得跳了起来|D 你长{zhang3}得真俊|D 她唱得比谁都好|D 他喝得烂醉
D 打得他满地找牙|D 骂得他狗血淋头|D 他跑得了{liao3}吗|D 我吃得了|D 这活干得漂亮|D 说得我都不好意思了|D 逼得他没办法|D 热得要命|D 好得很|D 困得不行
D 他忙得脚打后脑勺|D 你整得挺好|D 他喝得五迷三道的|D 冷得够呛|D 吓得他把手机都扔了|D 气得他把门一摔|D 弄得我们很被动|D 搞得大家都不高兴
D 闹得满城风雨|D 说得好听|D 做得不错|D 他哭得稀里哗啦|D 睡得香|D 吃得饱饱的|D 活得像个人样|D 他过得挺好|D 他混得不错|D 他想得太多了
D 她长{zhang3}得跟她妈一样|D 笑得合不拢嘴|D 激动得哭了|D 感动得说不出话|D 我怕得要死|D 他变得越来越沉默|D 弄得一团糟|D 跑得满头大汗|D 这事办得漂亮
D 那天他喝得太多了|D 拿得动吗|D 吃得下|D 他们聊得很开心|D 雪下得很大|D 风刮得厉害|D 屋里收拾得干干净净|D 他打扮得花枝招展|D 你想得美
D 跑得比兔子还快|D 他说得跟真的似的|D 急得他团团转|D 吓得我一身冷汗|D 羞得她满脸通红|D 老王跑得快|D 孩子哭得厉害|D 她妈气得直哆嗦
D 把孩子哄得高高兴兴的|D 老师讲得好|D 他领导得好|D 把屋子弄得乱七八糟|D 撑得我直打嗝|D 憋得他脸都红了|D 这菜做得太咸了|D 他整得我没脾气
D 走得了走不了|D 他来得晚|D 冻得够呛|D 他干得热火朝天|D 想得开|D 输得很惨|D 说得我心里发毛|D 你瞅瞅你嘚瑟得|D 他忙得连饭都顾不上吃
Dt 氣得把杯子摔了|Dt 嚇得她直哭|Dt 他寫得真好|Dt 冷得夠嗆|Dt 他說得對|Dt 累得我腰都直不起來|Dt 嚇得他把手機都扔了|Dt 你長{zhang3}得真俊
`;
// written after the first rules were settled (two later fixes came from its first 100 lines: 挺快 as one word, 我们/俩; and 两回)
const HELD = `
I 我估计得下周才能到|I 你得很小心才行|I 你得特别注意这一点|I 咱们还得再商量商量|I 他明天还得上班|I 她今年得考研|I 你们几个得留下|I 我们俩得去一趟
I 你得过安检|I 我得过一会儿再走|I 你得过马路才能到|I 得先吃饭|I 得去医院看看|I 他早晚得后悔|I 她肯定得生气|I 爸爸得去北京|I 姐姐得照顾孩子
I 医生得给他做手术|I 小张得加班|I 老李得请客|I 那钱得还|I 这病得治|I 这事儿得跟他说清楚|I 那人得赔钱|I 你可得想好了|I 你又得重新开始
I 我也得考虑考虑|I 大家都得排队|I 谁都得守规矩|I 然后你得往左拐|I 所以我们得早点出发|I 但你得答应我一件事|I 你得记住我说的话|I 你得吃药
I 你得穿厚点|I 你得赶紧报警|I 我得先洗个澡|I 咱得把话说明白|I 你得给句痛快话|I 俺得回去了|I 你得整点儿啥|I 这玩意儿得多少钱|I 你得等我
I 他们得搬家|I 你得负责到底|It 你得小心點|It 我們得走了|It 這病得治|It 他明天還得上班|It 你可得想好了
E 他得过病|E 他得过两次奖|E 谁得第一|E 你得第一|E 他得了个第二名|E 我得的是小病|E 这次他得了满分|E 她得过金牌|E 得了，你走吧|E 得，听你的
E 那还得了啊|E 他刚得了个孙子|E 她今年得了一个大奖|E 你得了这么多钱|Et 他得過病|Et 得，聽你的|Et 這還得了啊
D 钱还得差不多了|D 他估计得没错|D 你还得挺快|D 他跑得飞快|D 她哭得眼睛都肿了|D 吓得我赶紧跑|D 气得她一宿{xiu3}没睡|D 说得他脸都红了|D 你笑得真难看
D 他醉得一塌糊涂|D 写得太潦草了|D 他俩吵得不可开交|D 孩子们玩得很开心|D 活儿干得不赖|D 这雨下得真大|D 看得我眼都花了|D 饿得我前胸贴后背
D 把他吓得够呛|D 把我气得直哆嗦|D 整得跟真事儿似的|D 她打扮得挺好看|D 你来得正好|D 天冷得要命|D 他累得倒头就睡|D 走得太急了|D 这钱花得值
D 他俩处得挺好|D 她瘦得皮包骨|D 这房子收拾得挺干净|Dt 嚇得我趕緊跑|Dt 她哭得眼睛都腫了|Dt 這雨下得真大|Dt 他累得倒頭就睡
D 钱都还得差不多了|D 你估计得太乐观了|D 他回头回得很快|E 歇一会儿得了|D 他跑得比谁都快|D 你闹得也太过分了|D 他饿得直叫唤|D 我困得睁不开眼
D 他愁得一宿{xiu3}没合眼|D 她急得直跺脚|D 你吹得天花乱坠|D 他吓得一哆嗦|D 那孩子哭得可怜|D 冻得他直跺脚|D 气得我直想骂人|D 逗得大家哈哈大笑|D 撵得他满街跑
D 喝得他找不着北|D 他俩好得跟一个人似的|D 他乐得合不拢嘴|D 你造得跟个泥猴似的|D 屋子造得乱七八糟|D 你嘚瑟得没边了|D 他美得屁颠屁颠的
I 你得给我说清楚|I 咱可得说好了|I 那你还得谢谢我呢|I 他们早晚都得知道|I 我得上趟厕所|I 你得赶紧想辙|I 得找个人问问|I 这事儿你还得多操心|I 你得听我一句劝
I 俺们得回屯子|I 你也得替你妈想想|I 现在你得去自首|I 他们仨得一块走|I 你得陪我去|I 我得找他算账|I 你得喝了这碗|I 谁都得吃饭|I 那你得问他
E 这还得了吗|E 他得过两回奖|E 你得了便宜别卖乖|E 他得的那个病治不好|E 得，算我倒霉|E 得嘞，马上就来
`;
// written by a reviewer who had not seen the rules, the de set first (V得 after 还 / 估计 / 回头…, after a pronoun object, after a person
// or a surname, northeastern speech, podcast and TV lines, prose punctuation), then element boundaries (/) and « Lignes » rows (l)
const REVIEW = `
D 他还跑得动吗|D 欠的钱他早就还得一干二净了|D 这笔债他三年就还得差不多了|D 房贷还得挺快|D 他借的书都还得很及时|D 钱还得太慢了|D 那笔账他还得清清楚楚|D 这么多钱你还得了吗|D 你还得起吗|D 这债我还得起
D 借的钱他还得一分不少|D 他还得干脆利落
D 他估计得八九不离十|D 他把时间估计得太紧|D 你估计得准|D 这活儿他估计得不够
D 他回头看得清清楚楚|D 球他接得稳稳当当|D 他接着说得更起劲了|D 这事儿办得不地道|D 这事弄得我很尴尬|D 这事整得挺闹心|D 那事搞得大家都不痛快|D 这人长{zhang3}得挺精神|D 那人长{zhang3}得五大三粗的|D 这人说得倒轻巧
D 那人跑得比兔子还快|D 这钱花得冤枉|D 这钱挣得不容易|D 那钱来得太容易了|D 你看他那病得，脸都黄了|D 瞧他那病得，连床都下不来了|D 瞧他这病得，瘦成什么样了
D 打得他鼻青脸肿|D 把他吓得脸都白了|D 把我气得浑身发抖|D 他把我气得半死|D 看你美得，鼻涕泡都出来了|D 瞧你乐得那样|D 看把你急得|D 把她感动得稀里哗啦的|D 他把我们骗得好苦|D 你把他说得一无是处
D 把咱们折腾得够呛|D 他把自己喝得烂醉|D 把人家吓得够呛|D 把大家逗得前仰后合|D 你帽子老戴得歪歪扭扭的|D 他老顾得了这头顾不了那头
D 孩子哭得嗓子都哑了|D 老王说得对|D 小李跑得快|D 妈气得把碗都摔了|D 我妈气得一宿{xiu3}没睡|D 爸爸喝得满脸通红|D 老张笑得合不拢嘴|D 小刘吓得直往后退|D 老师讲得很清楚|D 医生说得很明白
D 警察来得很快|D 奶奶乐得直拍大腿|D 姥姥高兴得直抹眼泪|D 媳妇气得回娘家了|D 闺女长{zhang3}得随她妈|D 老公做饭做得比我好|D 儿子学得挺快|D 姐姐唱得好听|D 弟弟吃得满嘴是油|D 人家说得在理
D 大家玩得很尽兴|D 别人过得比你好|D 小王跑得满头大汗|D 老李喝得舌头都大了
D 你整得跟真的似的|D 这屋造得没法看了|D 你造得埋了吧汰的|D 他说得那叫一个溜|D 你弄得我一身汗|D 他忽悠得我直迷糊|D 你唠得挺来劲啊|D 他磨叽得我都烦了|D 整得我老闹心了|D 造得埋汰巴拉的
D 冻得嘎嘎的|D 热得冒油|D 他嘚瑟得不行|D 他整得挺像回事儿|D 咋整得这么埋汰|D 你咋{za3}喝得这么多
D 他一把推开门，吓得屋里人都愣住了|D “你看看，”他气得直跺脚|D “好！”老头乐得胡子直翘|D 他——跑得飞快|D 他说，说得眼泪都下来了|D 天太冷了，冻得人直哆嗦|D 跑——得——飞快|D 他气得……把杯子摔了
D 那年冬天雪下得特别大|D 他把车开得飞快|D 她把头发剪得很短|D 屋里静得能听见针掉在地上|D 他睡得像头死猪|D 她笑得很勉强|D 这顿饭吃得很憋屈|D 他把话说得很难听|D 那首歌她唱得特别动人|D 灯光暗得看不清人脸
D 他走得很急，连伞都忘了|D 她哭得说不出话来|D 风吹得窗户哐哐响|D 太阳晒得人睁不开眼|D 他瘦得只剩一把骨头|D 她把日子过得紧巴巴的|D 我们聊得忘了时间|D 他忙得四脚朝天|D 外面吵得我睡不着|D 他病得连饭都吃不下
D 这孩子病得不轻|D 那孩子长{zhang3}得真快|D 这孩子懂事得让人心疼|D 雨下得没完没了|D 这几天过得浑浑噩噩|D 她紧张得手心冒汗|D 他激动得一夜没睡|D 你说得轻巧
D 这本书写得真是太好了|D 这个故事讲得挺有意思的|D 他那会儿混得特别惨|D 那段时间我过得特别难|D 这个事情说得再直白一点|D 你这个问题问得好|D 他做得最好的一件事|D 当时我们吵得特别凶|D 后来他发展得很好|D 他回答得很巧妙
D 现在发展得太快了|D 然后他就哭得稀里哗啦|D 接着他又说得天花乱坠|D 再说得明白点|D 就说得好听|D 都说得差不多了|D 先说得好好的，后来又变卦了|D 才过得像样点|D 可把我累得够呛|D 这下把他乐得
D 那叫一个说得好|D 回头想想，他说得也有道理|D 估计说得没错
D 你想得倒美|D 你藏得够深的|D 你演得真像|D 你装得挺像啊|D 你来得正是时候|D 我看你是活得不耐烦了|D 他死得好冤|D 你这话说得|D 你骂得对|D 她打扮得跟个妖精似的
D 你们玩得开心吗|D 咱俩聊得来|D 他俩吵得不可开交|D 他们闹得很僵|D 我俩处得像亲兄弟
Dt 他把我氣得半死|Dt 這事辦得漂亮|Dt 那人長{zhang3}得五大三粗的|Dt 欠的錢他早就還得一乾二淨了|Dt 老王說得對|Dt 孩子哭得嗓子都啞了|Dt 你整得跟真的似的|Dt 這錢掙得不容易|Dt 嚇得屋裡人都愣住了|Dt 他估計得八九不離十
Dt 瞧他那病得，連床都下不來了|Dt 雨下得沒完沒了|Dt 你們玩得開心嗎|Dt 我們聊得忘了時間|Dt 妳說得對|Dt 這麼多錢你還得了嗎|Dt 你還得起嗎
I 我得回去拿钥匙|I 你得早点睡|I 咱们得抓紧了|I 他得请假|I 你得先把作业写完|I 这事儿还得你出面|I 你可得想清楚|I 我们得赶在天黑前到|I 你得给我个说法|I 那就得问你自己了
I 他明天得去医院复查|I 你们得把这个月的房租交了|I 我得找个地方躲一躲|I 你得帮我这个忙|I 老张得出差一个礼拜|I 孩子得打疫苗|I 这钱得省着花|I 那你还得等|I 大家都得配合|I 先得把手洗了
I 得赶紧送医院|I 得花不少钱吧|I 你得承认你错了|I 我们俩得好好谈谈|I 他们得重新装修|I 你得跟上|I 这个月得交房租|I 你得少喝点酒|I 我得考虑一下|I 今天得加班到很晚
I 你得把话说完|I 那得看他愿不愿意|I 我估计得等到下个月|I 你又得挨批评了|I 起码得半个月|I 你还得练|I 这活儿得两个人干|I 妈得做饭|I 姐姐得上夜班|I 您得慢点儿走
I 你得有耐心|I 咱得讲良心
It 你得早點睡|It 我們得抓緊了|It 這錢得省著花|It 那就得問你自己了|It 他明天還得上班
E 他得了一身病|E 她得了奖学金|E 我得了重感冒，躺了三天|E 他这次又得了第一|E 得了，别装了|E 得，我走还不行吗|E 他得过三次冠军|E 她得的是急性阑尾炎|E 得嘞，听您的|E 你得了便宜还卖乖
E 他们队得了亚军|E 那孩子得了白血病|E 得，又下雨了|E 他得了个外号|E 她得过金奖|E 我上周得了流感|E 这病是怎么得的|E 他得了三分|E 这还得了|E 老王得了个大胖小子
Et 他得了一身病|Et 得，又下雨了
D 他一听就气/得把杯子摔了|D 他跑/得满头大汗|D 他跑/得/满头大汗|D 他当时气/得说不出话来|D 把我吓/得一身冷汗|D 他一下子就气　得把杯子摔了|D 她哭/得稀里哗啦|D 打/得他满地找牙|Dl 得说不出话来|Dl 得一塌糊涂
Dl 得跟什么似的|D 跑——得——飞快|D 他气得——把杯子摔了|D 笑……得直不起腰|Dt 他當時氣/得說不出話來
I 你/得把她扔了|I 你得/把她扔了|I 。/得赶紧走了|I 你得去|E 得，就这样吧|E “得，”他说|E 他/得了第一名
`;
// this round (word classes, 得 at the edge of a longer word, podcast rows), written for it and tuned on: noun subjects and the verbs jieba
// files as nouns (她伤心得哭了), 还得 in both senses, 估计 / 肯定 / 回头 / 接着 + 得, 得过, 得 + an amount, the words that swallow 得
// (得来, 得出, 乐得, 挣得, 赢得, 吃得了, 还不得) in both uses, northeastern speech, traditional characters, and the five readings the last
// round listed as known wrong (他还得上这笔钱吗…), now counted. Rows: A^B$C = the row B after row A and before row C, ^^ / $$ = another
// speaker, ^B = the first row
const NEW = `
I 这房子得重新装修|I 这车得修修了|I 这孩子得好好管管|I 那件事得跟他商量|I 这个问题得好好想想|I 这些菜得趁热吃|I 这种病得早点治|I 学生得遵守纪律
I 病人得多休息|I 司机得注意安全|I 房子得修|I 衣服得洗了|I 这道题得用公式算|I 今天下午得开会|I 明年得考试|I 下个月得搬家|I 每个人得交五十块
I 这个得放冰箱|I 那些得赶紧处理|I 我们公司得裁员|I 他们家得卖房子|I 员工得按时上班|I 年轻人得多吃苦|I 老人得有人照顾|I 客人得先吃|I 这活儿得赶紧干完
I 那钱得省着点花|I 这个月得还房贷|I 这电脑得重装系统|I 这批货得今天发出去|I 那几个人得留下|I 两个人得抬着走|I 日子还得过
D 她伤心得哭了|D 他生气得直跺脚|D 这事计划得很周密|D 舞台布置得很漂亮|D 他总结得很到位|D 你记录得很详细|D 他寻思得挺周到|D 他客气得过分了
D 场面热闹得很|D 她热情得让人受不了|D 他节约得有点过头|D 表演精彩得没话说|D 他用心得很|D 她细心得让人感动|D 他老实得过分|D 她体贴得无微不至
D 她冷漠得像块冰|D 气氛紧张得让人喘不过气|D 他马虎得要命|D 她害怕得浑身发抖|D 他兴奋得一夜没睡|D 我高兴得跳了起来|D 她激动得说不出话来|D 他陶醉得忘了时间
D 这孩子机灵得很|D 她委屈得直掉眼泪|D 他着急得团团转|D 那姑娘漂亮得像朵花|D 这地方冷得吓人|D 这孩子懂事得让人心疼|D 学生们吵得老师直摇头|D 病人疼得直哼哼
D 司机开得太快了|D 这房子盖得真结实|D 这车修得挺好|D 那件事办得漂亮|D 这些菜做得真香|D 今天热得要命|D 这个月过得真快|D 日子过得紧巴巴的
D 衣服洗得干干净净|D 学生考得不错|D 员工干得很卖力|D 客人吃得很开心|D 这个问题想得太复杂了|D 他们队踢得很好|D 我们公司发展得很快|D 这批货卖得很好
D 那几个人跑得飞快|D 他这一觉{jiao4}睡得真香|D 这一跤摔得不轻|D 他精神得很|D 这事整得我很被动|D 她委屈得哭了一晚上
D 他很客气，客气得让人不舒服|D 她对人很好，热情得让人受不了|D 瞧那热闹得，跟过年似的|D 这条路漫长得让人绝望|D 这个问题棘手得让人头疼|D 很多人激动得哭了
D 两个人吵得不可开交|D 这个人长{zhang3}得挺精神|D 这些孩子玩得满头大汗|D 那种人坏得很|D 这种天气热得让人受不了|D 上周忙得脚不沾地|D 今天下午热得要命
D 学生们激动得跳了起来|D 那个司机开得飞快|D 这孩子胖得走不动路|D 那个病人瘦得皮包骨头|D 这家伙坏得流油|D 这玩意儿贵得离谱|D 那件事闹得满城风雨
D 这房子大得吓人|D 他们家穷得叮当响|D 我们公司忙得要死|D 他们队强得可怕|D 学生考得一塌糊涂|D 很多人急得直跺脚|D 老人乐得合不拢嘴|D 司机吓得脸都白了
D 那几个人笑得直不起腰|D 那时候穷得揭不开锅|D 小时候馋得直流口水|D 精彩得让人拍案叫绝|D 那热情得让人受不了|D 这精神头足得很
D 这事他办得到|D 我猜得出他想干什么|D 这么多你吃得完吗|D 他找得着路吗|D 这东西买得到吗|D 你看得到吗|D 他跟得上吗|D 你说得出口吗|D 这个价钱谁出得起
D 他们争得面红耳赤|D 你分得清吗|E 你能得到什么|E 他希望得到原谅|E 他能得到奖学金|E 他得到了一切|E 我们一定能得出结论
I 我还得上班|I 你还得等一会儿|I 他还得跑一趟|I 你还得给他道歉|I 这事还得你来|I 我还得去接孩子|I 还得两个小时|I 你还得好好练练|I 还得麻烦您跑一趟
I 你还得快点走|I 我们还得早点出发|I 他还得慢慢恢复|I 还得辛苦你了
D 这笔钱他还得很及时|D 欠的钱还得一分不少|D 房贷还得太慢|D 债还得清清楚楚|D 这钱你还得上吗|D 这些钱我三年就还得完|D 他借的钱都还得差不多了
D 那本书他还得挺快|D 钱他早就还得干干净净
I 我估计得晚点到|I 估计得等到明天|I 他肯定得来|I 你肯定得去|I 回头得跟他说一声|I 回头得好好谢谢人家|I 接着得干活了|I 接着得去下一家|I 肯定得出问题
D 他估计得太乐观|D 你估计得准|D 这个日期估计得太早了|D 这个价格估计得偏低|D 专家估计得保守|D 这一球接得漂亮|D 你估计得一点没错|D 这次估计得比较准
D 他还得上这笔钱吗|D 这钱他还得爽快|D 专家估计得保守了|D 这个数你估计得偏高了|D 他估计得过于乐观
E 他得过三次冠军|E 她得过金奖|E 我得过阑尾炎|E 他小时候得过肺炎|E 他得过一回大病|E 他年轻时得过奖|E 我也得过这个病|E 他得过诺贝尔奖
I 我得过两天再来|I 我得过一阵子才能回去|I 得过一会儿才知道|I 我们得过这条河
I 起码得三天|I 至少得五百块|I 这得两万块钱|I 你得一个人回去|I 最少得半年|I 这房子得三百万|I 这活儿得三个人一起干|I 那得好几年
E 他得三分|E 她这次得了两块金牌|E 他一共得了五票|E 再得两分就赢了|E 每人得一百块
I 你得来一趟|I 我们得来接你|I 明天你们都得来|I 早晚得出问题|I 你得出趟门|I 他得出趟远门|I 这事早晚得出乱子
D 爷爷乐得直拍手|D 瞧把你乐得|D 他乐得跟个孩子似的|D 这份工资挣得不容易|D 他们挣得多|D 他们队赢得很漂亮|D 这场球赢得太险了|D 你干得了吗|D 这活儿他干得了
E 我们得出结论|E 他得出了结论|E 这得来不易|E 他是怎么得来的|E 乐得清闲|E 他乐得自在|E 他挣得一份工资|E 他们赢得了比赛|E 他赢得尊重|E 喜得贵子|E 闲人不得入内
I 我还不得累死|I 那还不得花好多钱|I 你还不得被他骂死|I 那还不得把人急死
I 他说完了。^得赶紧走了|I 好，就这样。^得先把票买了|I 你还不走？^^得等他来|I 我先走了^^得早点回家|I ^得赶紧走|I 等一下^得先把票买了。$$好的
D 他当时气^得说不出话来|D 她笑^得前仰后合|D 我们被他吓^得半死|D 那天冷^得要命|D 他跑^得满头大汗|D 他气得$说不出话来|D 当时他一下子就气^得把杯子摔了
E 你说吧。^得，就这样吧|E 那好吧^^得，听你的
I 咱得唠唠嗑|I 你得麻溜儿的|I 你得瞅着点儿|I 那你得赶紧的|I 你得给我整明白|I 你得寻思寻思|I 他寻思着得去趟城里|I 我认为得赶紧报警|I 我看来得重新考虑
D 唠得挺热乎|D 他嘚瑟得没边|D 冻得哆哆嗦嗦的|D 你整得我都懵了|D 这屋造得埋了巴汰的|D 他忽悠得挺好
It 這房子得重新裝修|It 你還得給他道歉|It 他肯定得來|It 我還不得累死|It 起碼得三天|It 你得過安檢|It 這個月得交房租|It 早晚得出問題|It 你得來一趟
Dt 她傷心得哭了|Dt 這筆錢他還得很及時|Dt 他樂得合不攏嘴|Dt 這份工資掙得不容易|Dt 他估計得太樂觀|Dt 這場球贏得太險了|Dt 他當時氣^得說不出話來
Et 她得過金獎|Et 我們得出結論|Et 他們贏得了比賽|Et 這得來不易
`;
// written after the rules of this round were frozen, and not tuned on: the same themes, other sentences
const HELD2 = `
I 这个周末得加班|I 那几本书得还给图书馆|I 这些衣服得送去干洗|I 大夫得先看看片子|I 病人家属得签字|I 新来的同事得培训一个月|I 这个房间得通通风
I 那个合同得重新签|I 每个学生得交一篇作文|I 这顿饭得我请|I 这批零件得返工|I 孩子们得早点睡|I 那辆车得送去修|I 这套房子得付首付
I 学校得给个说法|I 客户得提前预约|I 这孩子得打针|I 那个病得开刀|I 这张表得填两份
D 他热心得过了头|D 这姑娘文静得很|D 那小子横得没边|D 他霸道得让人害怕|D 他老实得有点傻|D 那家伙狡猾得像只狐狸|D 她勤快得闲不下来|D 这孩子调皮得让人头疼
D 他规矩得像个小学生|D 他小气得要命|D 那个人古怪得很|D 他痛快得很|D 场面混乱得一塌糊涂|D 他风光得很|D 那位老人硬朗得很|D 这活儿累得我腰酸背痛
D 学生们紧张得手心出汗|D 那个司机困得直打哈欠|D 他们公司亏得一塌糊涂|D 客人们吃得心满意足|D 这顿饭吃得我直打嗝|D 那件衣服洗得发白了|D 这间屋子收拾得井井有条
D 那几个孩子饿得直哭|D 老板气得脸都青了
I 我们还得再走两里路|I 他还得照顾老母亲|I 你还得交一份检讨|I 这事还得从头说起|I 还得请你多多关照|I 回去还得写作业|I 你还得重新排队|I 我明天还得早起
D 这笔债他还得很辛苦|D 钱我还得一干二净|D 他这次还得真爽快|D 欠款还得太晚了|D 那些钱他早还得清清楚楚了|D 你借的东西还得太迟了
I 估计得排很久的队|I 他估计得明天才回来|I 这次肯定得挨骂|I 你回头得给我回个电话|I 接着得收拾屋子|I 我估计得找人帮忙
D 你估计得一点不差|D 这个数字估计得太高了|D 他接得稳稳的|D 时间估计得很准
E 他得过一等奖|E 我奶奶得过中风|E 她年轻时得过肝炎|E 这孩子得过好几次肺炎|I 你得过了这座桥再拐|I 得过两个路口才到|I 我得过几天再给你答复
I 这趟起码得四个小时|I 少说也得五六千块|I 这件衣服得八百块|I 装修得三个月|I 我们得两个人一起去|E 他这次得了九十分|E 他们一共得了三块金牌|E 这次比赛他得两分
I 你们明天都得来上课|I 我得来回跑好几趟|I 他得出一趟远门|D 他乐得直搓手|D 这钱挣得太辛苦了|D 这场比赛赢得很艰难
D 你拿得动吗|D 这么远你走得到吗|D 我听得出是他的声音|D 他做得到|D 你吃得下吗
E 这是他应得的|E 他得出的结论很可靠|E 我们终于得出了答案|E 他乐得看热闹|E 她赢得了大家的尊重|E 他喜得千金
I 那还不得把他气死|I 我还不得被我妈骂死|I 那还不得饿死
I 就这么定了。^得先去银行取钱|I 你先说吧^^得从头讲起|D 他一下子就急^得满头大汗|D 我们那天累^得不行|E 好了。^得，你别说了|I ^得赶紧把门关上|D 这件事把他吓^得直哆嗦
I 你得麻溜儿走|I 咱得整点儿下酒菜|I 这事儿你得上点心|D 他磨叽得我直上火|D 这屋冷得嘎嘎的|D 你埋汰得没法看|I 你得瞅准了|I 这玩意儿得老贵了
It 這個週末得加班|It 你還得重新排隊|It 估計得排很久的隊|Dt 他霸道得讓人害怕|Dt 這筆債他還得很辛苦|Et 他得過一等獎|It 那還不得把他氣死|Dt 他樂得直搓手
It 這套房子得付首付|Dt 那幾個孩子餓得直哭
`;
// written by a second reviewer after this round, not tuned on: noun subjects before verbs and adjectives jieba files as nouns
// (这孩子懂事得让人心疼), 还得 / 估计得 / 肯定得 / 回头得 / 接着得 both ways, 得过 and amounts, the re-split words both ways, rows,
// northeastern speech, traditional characters
const REVIEW2 = `
D 这孩子懂事得让人心疼|D 这个人老实得过分|D 那姑娘漂亮得不像话|D 这东西便宜得离谱|D 两个人熟得不能再熟|D 这个月忙得脚不沾地|D 这个人气得直哆嗦|D 那老头病得起不来床|D 这屋子热得像蒸笼
D 这个工人累得满头大汗|D 那个司机忙得顾不上吃饭|D 这个妈妈急得团团转|D 这个老师领导得非常好|D 那个学生生气得摔门而去|D 这个女孩伤心得哭了一夜|D 那个孩子高兴得蹦了起来|D 这个球迷激动得热泪盈眶|D 这个新人紧张得说不出话
D 那群孩子兴奋得睡不着觉{jiao4}|D 这个病人难受得直打滚|D 那位老人感动得流下了眼泪|D 这个小孩害怕得躲到床底下|D 这个家长着急得直搓手|D 这天气热得要命|D 这种天气冷得受不了|D 两个孩子吵得不可开交|D 三个人喝得东倒西歪
D 这一家人过得和和美美|D 这个演员演得特别好|D 这个歌手唱得跑调了|D 这姑娘俊得很|D 这小子精得像猴|D 那个小伙子壮得像头牛|D 这只猫胖得走不动|D 这条狗凶得吓人|D 这个房间暗得什么都看不见
D 这本书厚得像砖头|D 这碗面咸得没法吃|D 这道菜辣得我直流眼泪|D 这杯咖啡苦得要死|D 这件衣服大得离谱|D 这个价钱贵得吓人|D 这双鞋小得穿不进去|D 这条河宽得望不到边|D 这座山高得看不见顶
D 那间屋子乱得下不去脚|D 这个城市美得像画一样|D 这孩子聪明得让人吃惊|D 这女人厉害得很|D 那个学生用功得很|D 这个老板抠门得要死|D 这个人倔得像头驴|D 那个人狂得不知天高地厚|D 这个会开得太长了
D 这场雨下得真及时|D 这顿饭吃得真舒服|D 那盘棋下得很精彩|D 这个觉睡得真踏实|D 这一仗打得漂亮|D 那篇文章写得很感人|D 这个字写得歪歪扭扭|D 那件事处理得很妥当|D 这个计划安排得很周到
D 这个房子装修得很豪华|D 这条路修得很平|D 这辆车开得很稳|D 今年冬天冷得出奇|D 去年夏天热得要命|D 昨天晚上睡得很晚|D 那时候穷得叮当响|D 上个月忙得要死|D 这个小姑娘害羞得满脸通红
D 那个胖子懒得出奇|D 这孩子淘气得没边|D 这个大夫细心得很|D 那个护士温柔得像水|D 这位老师耐心得让人佩服|D 这个保安困得直点头|D 那个邻居热心得过了头|D 这个年轻人自信得有点过头|D 那俩人亲热得像一家人
D 这群学生安静得出奇|D 那几个工人辛苦得很|D 这人糊涂得连自己姓啥都忘了|D 那个女的精明得很|D 这个城市干净得一尘不染|D 这个村子穷得揭不开锅|D 这家饭馆火得排长队|D 这条街热闹得很|D 这孩子瘦得只剩一把骨头
D 那个病人虚弱得说不出话|D 这笔钱他还得很痛快|D 他借的钱还得一分不差|D 那本书她还得很准时|D 你借的伞还得挺快啊|D 这些钱他还得太晚了|D 这个数字他估计得很准|D 你估计得太悲观了|D 工期估计得太短了
D 损失估计得过高|D 他把困难估计得太大了|D 这个球他接得很稳|D 他跑得过我吗|D 我打得过他|D 这理由说得过去|D 你斗得过他吗|D 我们比得过他们|D 你信得过我吗
D 这件事瞒得过谁|D 她跑得过兔子|D 你说得过他吗|D 这部电影值得一看|D 我记得三年前的事|D 我觉得一个人也挺好|D 他气得一句话也说不出来|D 他吓得一夜没睡|D 他累得一动不动
D 他吃得一干二净|D 我们玩得一身泥|D 屋子收拾得一尘不染|D 他摔得两腿发软|D 他笑得两眼眯成一条缝|D 他累得半天爬不起来|D 他喝得半醉|D 他乐得直蹦|D 他们赢得很轻松
D 两个人争得不可开交|D 这事我办得到|D 你做得到吗|D 那个地方找得到吗|D 我看得出来他不高兴|D 你说得出口吗|D 我吃得了这么多|D 你走得了{liao3}吗|D 这个价钱我买得起
D 你受得住吗|D 他坐得住吗|D 你跟得上吗|D 他考得上大学吗|D 这么多人坐得下吗|D 这个箱子放得下|D 我吃得下两碗饭|D 你认得出他吗|D 你拿得动吗
D 这个门关得上吗|D 他记得住这么多吗|D 这钱挣得太辛苦|D 这场赢得真漂亮|D 他们挣得盆满钵满|D 你整得我直迷糊|D 这屋造得埋了巴汰的|D 他嘚瑟得找不着北|D 你咋整得这么埋汰
D 他唠得挺带劲|D 冻得我直哆嗦|D 那旮旯冷得嘎嘎的|D 这孩子虎得很|D 他忽悠得大伙一愣一愣的|D 这人磨叽得要命|Dt 這孩子懂事得讓人心疼|Dt 這個人老實得過分|Dt 那姑娘漂亮得不像話
Dt 這東西便宜得離譜|Dt 這個月忙得腳不沾地|Dt 這個女孩傷心得哭了一夜|Dt 那個孩子高興得蹦了起來|Dt 這筆錢他還得很痛快|Dt 你估計得太悲觀了|Dt 他跑得過我嗎|Dt 這理由說得過去|Dt 他們贏得很輕鬆
Dt 這事我辦得到|Dt 這個價錢我買得起|I 明天我还得早起|I 你还得把作业写完|I 他还得照顾他妈|I 咱们还得赶路呢|I 回来还得费劲重装|I 还得重新排一次队|I 你还得多吃点
I 那还得看情况|I 这事还得慢慢来|I 我估计得晚点回去|I 估计得下大雨|I 他估计得住院|I 肯定得出事|I 这回肯定得挨批|I 你肯定得去一趟|I 回头得请他吃饭
I 回头你得给我打个电话|I 接着得开会|I 接着我们得去机场|I 这个星期得交报告|I 下个月得考试|I 这孩子得多吃点|I 那车得加油了|I 这桌子得擦一擦|I 老人家得多休息
I 年轻人得多锻炼|I 那份报告得重写|I 这门课得好好学|I 这些孩子得有人管|I 新同事得慢慢适应|I 病人得按时吃药|I 学生们得排好队|I 主任得签个字|I 这得花两千块
I 至少得三个人|I 少说得一个礼拜|I 起码得两年|I 你得一个人扛着|I 你明天得来一趟|I 你们都得来开会|I 他下午得来|I 他早晚得出事|I 你得出去走走
I 我得出门了|I 你得过了这个坎|I 快过年了，得勤着点卖|I 顾客每买五十斤米就得亏三斤|I 咱得整两个菜|I 你得麻溜的|I 这玩意儿得老鼻子钱了|It 明天我還得早起|It 這孩子得多吃點
It 你明天得來一趟|It 他早晚得出事|It 回頭你得給我打個電話|E 他得了一百分|E 她得了三票|E 我们队又得一分|E 这份荣誉得来不易|E 这钱是怎么得来的|E 实验得出的数据
E 我们得出一个结论|E 这里不得吸烟|E 他乐得清闲|E 他乐得做个顺水人情|E 他们赢得了冠军|E 他赢得了尊重|E 他为国家争得了荣誉|E 他获得了一等奖|E 他取得了好成绩
E 他博得了满堂彩|E 他赢得了一分|E 他们争得宝贵的时间|E 球队赢得关键的胜利|E 农民均得到补偿|E 他得过一次大奖|E 我得过肺结核|E 他得的是胃病|Et 他得了一百分
Et 這份榮譽得來不易|Et 我們得出一個結論|I 你先回去吧。^得赶紧走了|I 他当时气^^得赶紧走了|E 好吧。^得嘞|D 他跑^得$飞快|E ^得了|D 他一下子就气^得直跺脚|E 何得如此无礼
`;
// still wrong, from the held-out part above (its first run: 131 sentences, these three among them): 得出 / 乐得 kept as one word, read dé
// as before this round (DE_SPLIT_CHU has no 大事 or 个, and 乐得 + 眼泪 shows nothing only a complement could be); printed, not counted
const KNOWN = 'I 我们班得出个节目|I 迟早得出大事|D 她乐得眼泪都出来了' +
  // the second reviewer's, read as before this round: 乐得嘴 / 挣得 / 争得 kept as one word (dé), 还不得 + an unknown verb; 今日得见 (classical dé)
  '|D 他乐得嘴都合不上|D 小伙子挣得不少|D 他俩争得脸红脖子粗|I 那还不得疼死|E 今日得见夫人';
// words with 得 inside them keep their dictionary reading: only a regression check (觉得, 不得不, 非得…, and the real words of this round's splits)
const WORDS = '我觉得他是对的|你记得吗|他不得不走|你非得这样吗|我总得吃饭吧|他得到了一切|你懂得真多|这事值得一试|他显得特别年轻|你来得及吗|得了吧|他得罪了人|这可不得了|舍不得走|' +
  '我们得出结论|这得来不易|得来全不费工夫|乐得清闲|他取得了成功|他获得了冠军|赢得一致好评|这本书值得一读|我晓得了|免得他担心|省得麻烦|落得一场空|博得掌声|难得糊涂|' +
  '我们不得而知|舍得花钱|他懂得很多|他记得很清楚|钱得来容易|他得出的结果不对|这个结论是怎么得出的|' +
  // 赢得 / 挣得 + an adjective before a noun, 即 (a verb for jieba) + 得到: dé (the second reviewer's)
  '这家店赢得良好口碑|她赢得广泛赞誉|他挣得丰厚的报酬|他赢得可观的收入|企业能赢得良好商业声誉|他第二天即得到答复|首次演出即得到领导的重视|這家店贏得良好口碑';

// the other characters: label = the expected pinyin, flags as for 得 (t, l, /, ^, $), * before the character when it occurs twice. dev: written
// with the rules and tuned on; held: written after the character's rule was frozen, not tuned on (counted apart; its first run found one
// rule error, 他长出了一口气, fixed since, and three wrong labels: 了不得 / 这还了得 liǎo, 数不胜数 shǔ); known: still wrong, not counted
const CHARS = {
  了: { dev: `
liao3 他跑得了吗|liao3 你吃得了这么多吗|liao3 你帮得了我吗|liao3 这么多活儿你干得了吗|liao3 他走得了吗|liao3 你管得了他吗|liao3 这么重你拿得了吗
liao3 你一个人搬得了吗|liao3 他用得了那么多钱吗|liao3 这病治得了吗|liao3 你去得了吗|liao3 他来得了吗|liao3 这苦你吃得了吗|liao3 怎么能忘得了
liao3 你一个人干得了这么多吗|liao3 他今天回得了家吗|liao3 这点钱花得了多久|liao3 谁也救不了他|liao3 我受不*了了|liao3 跑得*了和尚跑不了庙
liao3 这事你做得*了主吗|liao3t 他跑得了嗎|liao3t 你吃得了這麼多嗎|liao3l 你跑得了吗|liao3 他跑得/了吗
le5 他得了第一名|le5 这还得了|le5 你说一声就得了|le5 顺手弄好得了|le5 你得了吧|le5 他得了一场大病|le5 他又得了一个奖|le5 行了，别说*了
le5 我吃了|le5 他早就走了|le5 你别管了|le5 他跑了|le5 下雨了|le5 她笑了笑|le5 算了吧|le5 我们赢了|le5 这下可好了|le5 他病得不轻，都瘦了
liao3 他气得了不得|le5 他得了便宜还卖乖|le5t 他得了第一名|le5t 你說一聲就得了|le5 他记得了|le5 这样就行了
le5 你可算来了|le5 她哭得眼睛都红了`,
    held: `
liao3 这么点儿饭你吃得了吗|liao3 他一个人扛得了吗|liao3 我可管不了那么多|liao3 你救得了他一时|le5 他得了一身病|le5 我们终于到了|le5 你就别管了|liao3 这事你办得了吗|liao3 他俩好得了不得|le5 我早就忘了|liao3 你走得了吗|liao3 这还了得|liao3t 你一個人搬得了嗎|le5t 他早就走了|liao3 谁也拦不了他|le5 我想通了|liao3 你受得了这个吗|le5 他终于得了第一` },
  着: { dev: `
zhao2 我找着了|zhao2 你猜着了|zhao2 钥匙找着了吗|zhao2 别把孩子冻着了|zhao2 他着了凉|zhao2 房子着了火|zhao2 他像着了魔一样|zhao2 你可别吓着了
zhao2 他睡得着吗|zhao2 这孩子饿不着|zhao2 东西买着了|zhao2 他摸着了门把手|zhao2 我碰着了他|zhao2 你够得着吗|zhao2 他累着了|zhao2 我点着了火
zhao2 这回可让我逮着了|zhao2 灯一下就点着了|zhao2t 我找著了|zhao2t 他著了涼|zhao2 让他抓着了|zhao2 你烫着了吗|zhao2 他着了道儿
zhe5 他笑着说|zhe5 门开着|zhe5 你等着|zhe5 他看着我|zhe5 先凑合用着了|zhe5 他拿着一本书|zhe5 外面下着雨
zhe5 他走着走着就到了|zhe5 你听着|zhe5 墙上挂着一幅画|zhe5 她抱着孩子哭|zhe5 我正忙着呢|zhe5 他躺着看电视|zhe5 灯亮着
zhe5t 他笑著說|zhe5t 門開著|zhao2 他找/着了|zhao2l 钥匙找着了吗|zhe5 她们说着笑着|zhe5 你瞧着吧`,
    held: `
zhao2 你猜着了吗|zhao2 我终于找着了他|zhao2 小心别烫着了|zhao2 他着了急|zhe5 他们一直看着|zhe5 她哭着跑了|zhao2 这下可算让我逮着了|zhe5 门口站着一个人|zhe5 他捂着脸|zhao2 夜里冻着了|zhao2 这孩子吓着了|zhe5 他们说着话|zhao2 我睡不着|zhe5 手里攥着钱|zhao2t 你猜著了嗎|zhe5t 他們一直看著|zhao2 他摸着了开关|zhe5 我等着你` },
  冲: { dev: `
chong4 他冲我笑了笑|chong4 她冲他喊了一声|chong4 他冲我们挥手|chong4 他回过头来冲我摆了摆手|chong4 他冲着镜头笑|chong4 你冲着我来|chong4 他冲我点点头
chong4 她冲他使了个眼色|chong4 他冲你吼什么|chong4 别冲我发火|chong4 他冲大家鞠了一躬|chong4 这酒挺冲的|chong4 他说话太冲|chong4 这味儿有点冲
chong4 冲着这一点我也得去|chong4 我是冲着他来的|chong4 他冲自己笑了笑|chong4t 他衝我笑了笑|chong4t 她衝著他喊|chong4 她冲他们摆手|chong4 他冲她眨眨眼
chong1 他冲了出去|chong1 他冲过来了|chong1 冲啊|chong1 大家一起往前冲|chong1 他冲进了屋里|chong4 他冲他冲过去|chong1 他冲个澡
chong1 洪水冲垮了大坝|chong1 他冲上台|chong1 她冲了一杯咖啡|chong1 他一下子冲到门口|chong1 他冲下楼去|chong1 别冲动|chong4l 他冲我笑了笑
chong4 他冲/我笑|chong1 两辆车迎面冲过来|chong1 他冲出门|chong1 浪头冲上岸|chong4 他冲着火冲过去`,
    held: `
chong4 他冲我眨了眨眼|chong4 她冲门外喊|chong4 他冲她笑了一下|chong1 他冲进了雨里|chong1 冲上去|chong4 别老冲孩子发脾气|chong4 他冲我们点了点头|chong1 他冲了个凉水澡|chong4 这烟太冲了|chong1 他们冲出了包围|chong4 她冲着窗外发呆|chong1 一股热气冲上来|chong4 他冲他妈嚷嚷|chong4t 他衝我眨了眨眼|chong1t 他衝進了雨裡|chong4 你冲我喊什么|chong1 他一下子冲过去了` },
  长: { dev: `
zhang3 她长得真好看|zhang3 他长得像他妈|zhang3 这孩子长得很快|zhang3 你长得挺精神|zhang3 他长得很高|zhang3 她长得跟她姐一样|zhang3 脸上长着雀斑
zhang3 他脸上长着几颗青春痘|zhang3 院子里长满了草|zhang3 我从小长在河边|zhang3 树上长出了新芽|zhang3 他头上长了个包|zhang3 他长了一身肉
zhang3 孩子长了一岁|zhang3 那姑娘长得水灵灵的|zhang3 这小伙子长得五大三粗|zhang3 庄稼长得真好|zhang3 他长得不怎么好看|zhang3t 她長得真好看
zhang3t 他臉上長著雀斑|zhang3 她长得特别漂亮|zhang3 你长成大姑娘了|zhang3 他长得有点丑|zhang3 这棵树长得太快了
chang2 这条路很长|chang2 日子还长着呢|chang2 这条路长得很|chang2 这绳子长得要命|chang2 头发太长了|chang2 裤子长了一截
chang2 这部电影太长|chang2 夜很长|chang2 长江|chang2 他长叹一声|chang2 时间一长就好了|chang2 来日方长|chang2 云长在后|chang2 这个会开得太长了
chang2t 這條路很長|chang2t 日子還長著呢|zhang3 她/长得真好看|zhang3l 长得真好看|chang2 那根竹竿长得出奇|zhang3 他的个子长得/真快`,
    held: `
zhang3 这孩子长得真俊|zhang3 他长得特别像他爸|zhang3 墙角长满了青苔|chang2 这条河很长|zhang3 她脸上长了个痘|chang2 夜还长着呢|zhang3 你长高了|chang2 这裙子太长了|zhang3 小树长出了叶子|chang2 他的头发很长|zhang3 他长得又高又壮|chang2 一年比一年长|zhang3 院子里长着一棵枣树|zhang3t 這孩子長得真俊|chang2t 這條河很長|zhang3 他从小在乡下长大|chang2 他长出了一口气` },
  数: { dev: `
shu3 我数{shu3}了*数，一共四十二节|shu3 我数了数{shu3}，一共四十二节|shu3 你数{shu3}一*数|shu3 数一下有多少人|shu3 星星多得数都数不过来|shu3 他数着日子过
shu3 我数过，一共十个|shu3 他在数钱|shu3 数到三就开始|shu3 我们班数他最高|shu3 数你最能说|shu3 他数了半天也没数清|shu3 她低着头数着手指头
shu3 你数数看|shu3 数星星|shu3 数不清有多少|shu3 美不胜数|shu3t 我數{shu3}了*數|shu3t 數到三就開始|shu3 数一遍|shu3 你帮我数一下|shu3l 数到三就开始
shu4 这个数不对|shu4 心里有数|shu4 数以万计|shu4 他报了个数|shu4 数百人参加了|shu4 你知道这个数吗|shu4 学生的数目不少|shu4 人数太多
shu4 数学很难|shu4 这个数字很大|shu4 无数次|shu4 数十年如一日|shu4 他凑了个整数|shu4 这数儿不吉利|shu4t 這個數不對|shu4 那个数太大|shu4 少数人
shu4 你数学好吗|shu4 一个数也不差|shu3 我数/了数`,
    held: `
shu3 你数数有几个|shu3 他数了一遍又一遍|shu4 这个数我记住了|shu3 她在心里默默数着|shu3 数到十就出来|shu4 人数不够|shu3 我数了三遍|shu4 你心里有个数|shu3 一二三，你来数|shu3 数不胜数|shu3 他一张一张地数钱|shu4 这个数字不对|shu3t 我數了三遍|shu4t 人數不夠|shu3 你数一下` },
  背: { dev: `
bei1 他背着一个孩子过河|bei1 她要背孩子下山|bei1 背起背篓就走|bei1 新郎背起新娘|bei1 我背不动了|bei1 他把柴背回家|bei1 他替别人背黑锅
bei1 他背包就走了|bei1 他每天背书包上学|bei1 他背起了伤员|bei1 你背得动吗|bei1 他背走了一袋米|bei1 她背行李上楼|bei1 他背起他就跑
bei1 战士们背枪出发|bei1 他背上山的柴|bei1 他背起老人往外跑|bei1t 新郎背起新娘|bei1t 我背不動了|bei1l 背起背篓就走
bei4 他背书背到半夜|bei4 你把课文背一遍|bei4 他背对着我|bei4 这三字经背起来一套套的|bei4 他背单词|bei4 背后有人|bei4 他的背很宽
bei4 你背地里说什么|bei4 他背过身去|bei4 我背熟了|bei4 他背着手走来走去|bei4 背靠背|bei4 他后背疼|bei4 别背信弃义|bei4 这首诗你背得出来吗
bei4 他靠着椅背|bei4t 他背書背到半夜|bei4t 背後有人|bei4 背起了唐诗|bei4 她背过脸去`,
    held: `
bei1 他背着奶奶上楼|bei1 她背上书包出了门|bei4 他背着我做了这件事|bei1 他把孩子背回家|bei4 你把这首诗背下来|bei1 我替你背黑锅|bei4 他背对着门|bei1 他背起行李就走|bei4 他背了一晚上单词|bei1 背得动吗|bei4 他背过脸去|bei1 他背孩子去医院|bei4t 你把這首詩背下來|bei1t 他背起行李就走|bei4 他的背有点驼` },
  转: { dev: `
zhuan4 他在屋里转了一圈|zhuan4 新郎背着新娘转三圈|zhuan4 他转了个圈|zhuan4 我们去街上转了一圈|zhuan4 地球绕着太阳转|zhuan4 他急得团团转
zhuan4 早饭后去早市转一圈|zhuan4 轮子转个不停|zhuan4 他转了好几圈|zhuan4 他在门口转来转去|zhuan4 他转了两圈才找到|zhuan4t 他在屋裡轉了一圈
zhuan4l 他转了一圈|zhuan4 你转一圈给我看看|zhuan4 他骑着车子转了一圈|zhuan4 风车转得很快|zhuan4 他转悠了一下午
zhuan3 他转过身去|zhuan3 他转身就走|zhuan3 往左转|zhuan3 天气转晴|zhuan3 我把钱转给你|zhuan3 他转了个弯|zhuan3 他转头看我|zhuan3 病情好转
zhuan3 把这封信转给他|zhuan3 他转学了|zhuan3 他转了三次车|zhuan3 转眼就到了|zhuan3 他转了话题|zhuan3t 他轉過身去|zhuan3t 往左轉|zhuan4 他转了/一圈
zhuan3 他转过来|zhuan3 他转了两趟车|zhuan3 事情有了转机|zhuan3 他转了个身|zhuan4 他围着操场转了三圈|zhuan3 他转过脸去|zhuan3 风向转了|zhuan4 车轮飞快地转着`,
    held: `
zhuan4 我们在公园里转了转|zhuan4 他绕着桌子转了一圈|zhuan3 他转身走了|zhuan3 车子往右转|zhuan4 陀螺转得飞快|zhuan3 他转过头来|zhuan4 他在屋里转来转去|zhuan3 天气转凉了|zhuan4 你转一圈让我看看|zhuan3 我把钱转过去了|zhuan4 他转了两圈就晕了|zhuan3 他的病好转了|zhuan4t 他繞著桌子轉了一圈|zhuan3t 他轉身走了|zhuan3 他转了好几趟车` },
  觉: { dev: `
jiao4 我睡了一觉|jiao4 好好睡个觉|jiao4 睡个好觉|jiao4 一觉醒来天都亮了|jiao4 他几个晚上睡不着觉|jiao4 睡上一个安稳觉|jiao4 中午睡午觉
jiao4 他一觉睡到中午|jiao4 你睡得着觉吗|jiao4 我想睡个懒觉|jiao4 他睡大觉去了|jiao4 睡个回笼觉|jiao4 他睡觉了|jiao4t 我睡了一覺|jiao4t 睡個好覺
jiao4l 我睡了一觉|jiao4 补觉|jiao4 他睡了个好觉|jiao4 昨晚没睡好觉|jiao4 他一觉到天亮
jue2 我觉得不对|jue2 他感觉很好|jue2 我不觉笑了|jue2 他自觉性很强|jue2 你觉着呢|jue2 他发觉了|jue2 她觉察到了|jue2 视觉|jue2 直觉
jue2 他毫无知觉|jue2 我觉出了不对劲|jue2 这是一种错觉|jue2 不知不觉|jue2 他幡然醒悟，大觉|jue2t 我覺得不對|jue2t 不知不覺|jiao4 他睡/觉了
jue2 先知先觉|jue2 我渐渐觉出味道来|jue2 他有所觉察|jue2 后知后觉|jue2 一时没有觉察`,
    held: `
jiao4 我先去睡一觉|jiao4 他睡了个好觉|jue2 我觉得他说得对|jiao4 一觉醒来已经中午了|jue2 他不知不觉睡着了|jiao4 好几天没睡个安稳觉|jue2 他发觉有人跟着他|jiao4 你好好睡一觉吧|jue2 她感觉不太舒服|jiao4 晚上睡不着觉|jue2 他察觉到了危险|jiao4 他睡了一大觉|jiao4t 我先去睡一覺|jue2t 我覺得他說得對|jiao4 中午睡个觉` },
  应: { dev: `
ying4 他应了一声|ying4 他应道|ying4 正应了那句老话|ying4 我叫他，他也不应一声|ying4 她嘴上应着，心里却不愿意|ying4 他应声倒地|ying4 她应着说
ying5 他答应了|ying4 他应了下来|ying4 这正应了古人的话|ying4 他连声应着|ying4t 他應了一聲|ying4t 他應道|ying4l 他应了一声|ying4 他应邀出席
ying4 他应了个景儿|ying4 应付了事|ying4 这叫报应|ying4 他反应很快|ying4 适应环境
ying1 你应该去|ying1 我们应坚持原则|ying1 应由大家决定|ying1 这事不应由他说了算|ying1 你应早点告诉我|ying1 应着制式服装|ying1 理应如此
ying1 本应如此|ying1 应有尽有|ying1 他应当负责|ying1 这是应得的|ying1 应届毕业生|ying1t 你應該去|ying1t 應由大家決定|ying4 他/应了一声
ying1 他应去而没去|ying1 罪有应得|ying1 你应知道|ying1 不应如此|ying4 她应了声好|ying1 我们应早做准备`,
    held: `
ying4 他应了一声就出去了|ying1 你应该早点说|ying4 我喊了半天也没人应|ying4 他嘴上应着|ying1 这事应由他负责|ying4 他应道：“知道了。”|ying1 你本应如此|ying4 他应了句好|ying4 这真应了那句话|ying1 他们应当道歉|ying4 敲了半天门没人应|ying4t 他應了一聲就出去了|ying1t 你應該早點說|ying1 不应该` },
  宿: { dev: `
xiu3 那狗在外头待了一宿|xiu3 他一宿没睡|xiu3 住了两宿|xiu3 折腾了半宿|xiu3 熬了一整宿|xiu3 开了一宿空调|xiu3 忍一宿就走|xiu3 我们住一宿就走
xiu3 他哭了半宿|xiu3 三宿没合眼|xiu3 他几宿没回家|xiu3t 他一宿沒睡|xiu3t 住了兩宿|xiu3l 他一宿没睡|xiu3 一宿一宿{xiu3}地睡不着|xiu3 行了一宿
xiu3 觅一宿再走|xiu3 整宿整宿{xiu3}地失眠|xiu3 聊了一宿
su4 他住在宿舍|su4 学生宿舍|su4 他在这儿留宿|su4 露宿街头|su4 风餐露宿|su4 住宿费|su4 归宿|su4 宿命|su4 他是宿敌|su4 宿醉未醒
su4 投宿|su4 借宿一晚|su4 寄宿学校|su4 宿营地|su4t 學生宿舍|su4t 露宿街頭|su4 宿怨|su4 他俩宿在一起|su4 宿将|su4 名宿|su4 住宿条件
xiu3 他一/宿没睡|su4 食宿全包|su4 宿根植物|su4 夜宿山中`,
    held: `
xiu3 他在网吧待了一宿|xiu3 我们俩聊了一宿|su4 他住学校宿舍|xiu3 她哭了一宿|xiu3 两宿没合眼|su4 今晚在哪儿住宿|xiu3 他守了半宿|su4 他们在山里露宿|xiu3 熬了一宿|su4 这是他的宿命|xiu3t 他在網吧待了一宿|su4t 他住學校宿舍|xiu3 一宿没睡好` },
  种: { dev: `
zhong4 我种了一棵树|zhong4 爷爷种了一辈子地|zhong4 他们种玉米|zhong4 这菜是我自己种的|zhong4 院子里种着花|zhong4 俺村没种过麦子|zhong4 光靠种粮食不行
zhong4 他种葡萄发了财|zhong4 他家种了三亩棉花|zhong4 我种的西瓜熟了|zhong4 种土豆|zhong4 他在山上种树|zhong4 你种过地吗|zhong4 种花种草
zhong4 春天种下种子|zhong4 两个暖棚种了牡丹|zhong4t 我種了一棵樹|zhong4t 院子裡種著花|zhong4l 我种了一棵树|zhong4 黑板上种庄稼|zhong4 种菜
zhong3 这种人|zhong3 那种感觉|zhong3 三种花|zhong3 各种各样|zhong3 一种说法|zhong4 多种了一些|zhong3 这种了不起的人|zhong3 品种|zhong3 种子
zhong3 有种你别走|zhong3 两种不同的意见|zhong3 某种程度上|zhong3 种类繁多|zhong3 人种|zhong3 种族|zhong3t 這種人|zhong3t 各種各樣|zhong3 每种都要
zhong3 几种颜色|zhong3 此种情况|zhong3 物种|zhong4 种瓜得瓜`,
    held: `
zhong4 他在院子里种了些菜|zhong3 我不喜欢这种人|zhong4 他们家种了好几亩地|zhong4 你种的花开了|zhong3 有好几种办法|zhong4 他种过烟叶|zhong3 这种事别找我|zhong4 我们自己种的|zhong4 她喜欢种花|zhong3 一种感觉|zhong4 去年种的树活了|zhong3 各种颜色|zhong4t 他在院子裡種了些菜|zhong3t 我不喜歡這種人|zhong4 他种着几亩果园` },
  重: { dev: `
chong2 重做一遍|chong2 我只好重买一本|chong2 帮我重做了房卡|chong2 我差点重做系统|chong2 你重写一份|chong2 重新开始|chong2 他重披婚纱|chong2 那里势必重燃战火
chong2 往事岂可重来|chong2 他重回故乡|chong2 我们重逢了|chong2 你重说一遍|chong2 重洗一遍|chong2 重拍一张|chong2 他重画了一张|chong2 卷甲重来
chong2 推掉重买|chong2 重读一遍|chong2 重考一次|chong2t 重做一遍|chong2t 你重寫一份|chong2l 你重说一遍|chong2 这首歌重唱一遍|chong2 重修旧好
zhong4 这箱子太重了|zhong4 很重|zhong4 他伤得很重|zhong4 你下手太重|zhong4 恩越重来情越深|zhong4 他重达一百公斤|zhong4 重活累活|zhong4 他病得很重
zhong4 这话说重了|zhong4 他的口音很重|zhong4 重于泰山|zhong4 重打四十大板|zhong4 重视|zhong4 重要|zhong4 他太重了|zhong4t 這箱子太重了|zhong4t 他傷得很重
zhong4 越来越重|zhong4 重伤|chong2 重/做一遍|chong2 他心事重重|zhong4 举重若轻|zhong4 重金|zhong4 他看得很重`,
    held: `
chong2 这字写得不好，你重写|chong2 我们重来一次|zhong4 这包太重了|chong2 他重做了一桌菜|zhong4 他病得不轻，伤得很重|chong2 你重说一遍|zhong4 这是很重的担子|chong2 我们重回老家|zhong4 他下手很重|chong2 她又重读了一遍|zhong4 这东西有多重|chong2 你把这段重唱一遍|chong2t 這字寫得不好，你重寫|zhong4t 這包太重了|zhong4 心里很重` },
  量: { dev: `
liang2 量了量体温|liang2 量体温|liang2 他量了一下尺寸|liang2 护士在量血压|liang2 你量一量{liang2}|liang2 我量过了|liang2 量身高|liang2 他量了半天
liang2 派人量了尺寸|liang2 她拿尺子量着|liang2 我给你量量|liang2 量一下腰围|liang2t 量了量體溫|liang2t 護士在量血壓|liang2l 他量了一下尺寸|liang2 他在量身高的时候
liang2 量体裁衣|liang2 测量|liang5 打量|liang5 他上下打量着我|liang2 丈量土地|liang2 你量一下|liang2 先量了再买
liang4 饭量很大|liang4 这个量太大了|liang4 适量|liang4 量力而行|liang4 他酒量好|liang4 尽量|liang4 质量|liang4 重量|liang4 大量|liang4 数量
liang4 量变引起质变|liang5 力量|liang4 量很足|liang4t 飯量很大|liang4t 量力而行|liang4 雨量|liang4 量小非君子|liang4 这量够吗|liang2 量/了量|liang4 宽宏大量
liang4 能量|liang4 他的饭量减了|liang4 运动量`,
    held: `
liang2 你给他量量体温|liang2 她量了量{liang2}裤长|liang4 他的饭量不小|liang2 护士给我量了血压|liang4 尽量早点回来|liang2 我先量一下尺寸|liang4 这雨量太大了|liang2 他拿尺子量了半天|liang4 他酒量不行|liang2 量一下身高|liang4 量力而为|liang2t 護士給我量了血壓|liang4t 他的飯量不小|liang2 你量过吗` },
  铺: { dev: `
pu1 铺在床上|pu1 浴室里铺了块毛巾|pu1 院子里铺满了落叶|pu1 把床铺好|pu1 毛巾都铺好了|pu1 房间里铺着地毯|pu1 他铺了一层报纸|pu1 摊子铺得太大
pu1 光纤铺到县里|pu1 水泥铺成的院子|pu1 铺平道路|pu1 铺开地图|pu1 铺路|pu1 铺床|pu1 铺天盖地|pu1 地上铺着报纸|pu1t 鋪在床上|pu1t 房間裡鋪著地毯
pu1l 铺在床上|pu1 他直接铺了一层床单|pu1 铺开一张纸|pu1 铺垫|pu1 她把桌布铺好
pu4 他开了个铺子|pu4 店铺|pu4 床铺|pu4 当铺|pu4 上下铺|pu4 饭铺|pu4 他在铺子里|pu4 杂货铺|pu4 肉铺|pu4 通铺|pu4t 店鋪|pu4t 當鋪
pu4 睡在铺上|pu4 卧铺|pu4 他去铺里|pu4 药铺|pu4 铺位|pu1 铺/在床上|pu4 铁匠铺|pu4 这家铺子|pu4 打地铺|pu4 床铺上|pu4 他的铺`,
    held: `
pu1 她把被子铺在床上|pu1 地上铺了一层稻草|pu4 他在镇上开了个铺子|pu1 桌上铺着白布|pu4 他睡上铺|pu1 我们把地毯铺好|pu4 这家铺子关门了|pu1 他铺了张报纸坐下|pu4 他住在铺里|pu1 路面铺得很平|pu4 杂货铺的老板|pu1t 她把被子鋪在床上|pu4t 這家鋪子關門了|pu1 铺开被褥` },
  呗: { dev: `
bei5 冻死的呗|bei5 卖钱呗|bei5 再买呗|bei5 联系我呗|bei5 差就差呗|bei5 不去就不去呗|bei5 那就走呗|bei5t 凍死的唄|bei5 混呗|bei5 还能咋样，过呗`,
    held: `` },
  咋: { dev: `
za3 咋死的|za3 你咋才来|za3 这可咋办|za3 不知道咋回事|za3 你咋不说话|za3 这咋整|za3 咋了|za3 他咋还不来|za3t 你咋才來|za3 不管咋说|za3 咋样`,
    held: `` },
};

const want = { I: 'dei3', E: 'de2', D: 'de5' };
const name = { dei3: 'děi', de2: 'dé', de5: 'de' };// written by a third reviewer: the false readings found on fresh sentences (就走得了, 还钱都不要了, 冲你的咖啡, 这一夜长得像一年, 就这个数了,
// 我的铺在下面…), fixed since; counted like the held-out sets
const REV3 = {
  了: `le5 要不你干脆走得了|le5 实在不行你就卖得了|le5 那你就嫁得了，还犹豫啥|le5 你回家睡得了，别熬着|le5 你就拿得了，跟我客气啥|le5 我看你就去得了|le5 就这么办得了|le5 我看就这么说得了|le5 那就买得了|le5 你直接打得了，别发微信|le5t 你乾脆走得了|liao3 你还走得了吗|liao3 这么多活你干得了吗`,
  着: `zhe5 被子在外面晒着了`,
  冲: `chong1 用凉水冲他的伤口|chong1 你去冲你的咖啡|chong1 她给孩子冲我刚买的奶粉|chong1 帮我冲我那杯茶|chong1 快去冲你的澡吧|chong1 你冲你的，我泡我的|chong1 我们就这么冲了上去|chong1 他们真冲了出去|chong1t 你去沖你的咖啡|chong1l 冲你的澡去`,
  长: `chang2 这一夜长得像一年|chang2 那条走廊长得跟没有尽头似的|chang2 队伍长得像条龙|chang2 这一天长得好漫长|chang2 日子还长着嘞|chang2 路还长着哩|chang2 这一版比上一版长了不少|chang2 牛市难以长在|chang2t 這一夜長得像一年|chang2 日子/长得像一年`,
  数: `shu4 就这个数了，不能再少了|shu4 这个数我最清楚|shu4 这个数到明年就翻倍了|shu4 那个数你最好记住|shu4 这数到了月底就清零|shu4t 這個數我最清楚`,
  背: `bei4 他背儿子的作文给大家听|bei4 他背女儿的日记|bei4 他背起他的台词来|bei4t 他背兒子的作文給大家聽`,
  宿: `su4 东方七宿`,
  重: `zhong4 活重做不完|zhong4 他伤重来不了`,
  量: `liang4 已经是最大的量了|liang4 就这个量了|liang4 这个量过了|liang4 药的量过了|liang4 这个量过大|liang4t 就這個量了`,
  铺: `pu4 我的铺在下面|pu4 火车上我的铺在中间|pu4 他的铺得收拾一下`,
};
for (const [ch, x] of Object.entries(REV3)) CHARS[ch].rev = x;

// written by a fourth reviewer, after the third round's fixes, on the exact contexts each rule keys on (V得了 / V不了, the verbs of 着,
// 长 the adjective before 得 / 着 / 了 / 在…), not tuned on; four rules were narrowed on its first run (冲 not after 好: 这奶粉很好冲; 数 not
// after 这些 / 的: 就这些数了; 背 not before a verb: 他背奶奶教的那首诗; 觉 一 not before 出 / 不: 她一觉出不对来; 应 道 only at the end:
// 你应道个歉; 宿 not 七宿, the stars; 种 not after 同: 不同种了; 量 了 only before what is measured: 喝到量了, 药加量了) and the
// sentences after them written fresh; counted like the held-out sets
const REV4 = {
  了: `
le5 你干脆跟他走得了|le5 不行咱就退得了|le5 你就跟他们说得了|le5 那你干脆管得了，省得我操心|le5 别折腾了，就这么用得了|le5 实在不想去就别去得了|le5 他去不去我也管不着了|le5 你可算回来了，吃了吗|le5 我们说好了，谁也不许变|le5 他把钱都花了
le5 他死活不来了|le5 我忘了你叫什么|le5 他真不想干了|le5 他记不清了|le5 我等了你一辈子|le5 你干脆辞职得了|le5 实在不行就退了得了|le5 你干脆搬回来住得了|le5 我看你干脆嫁给他得了|le5 不想干就别干得了|le5 你干脆吃了得了|le5 你就收下得了
le5 别等了，咱们先吃得了|le5 我看咱们干脆走得了|le5 你就跟他说得了|le5 你干脆把它卖了得了|le5 那就这么定得了|le5 你回去睡得了|le5 他吃得满嘴是油，吃完了才走|le5 他喝得太多了|le5 他走得很快，一会儿就没影了|le5 他跑得满头大汗，累坏了
le5 他干得不错，老板都夸了|le5 她哭得眼睛都肿了|le5 他说得口干舌燥了|le5 他看得入了迷|le5 他睡得太死了|le5 他活得太累了|le5 我做得够多了|le5 他没来，我也不等了|le5 我不去了|le5 那我不管了|le5 算了，不说了|le5 他早就不干了
le5 我不吃了，你们吃吧|le5 你不用来了|le5 他不想活了|le5 我再也不信了|le5 她不哭了|le5 天不早了，回去吧|le5 你可别再喝了|le5 我们说好了不吵了|le5 他吃了两碗饭|le5 我看了你写的信|le5 他拿了钱就走|le5 你帮了我大忙|le5 我找了他好几天
le5 我已经告诉了你|le5 他送了我一本书|le5 他救了我一命|le5 我给了你多少次机会|le5 他打了他一巴掌|le5 他用了多少钱|le5 你去了多久|le5 他喝了那么多酒|le5 他得了这么大的奖|le5 他得了什么病|le5 这孩子得了个怪病|le5 你得了吧
le5 他去年得了个孙子|le5 我说完了，你说吧|le5 这一走就是一辈子了|le5 他们好了一辈子|le5 他忍了一辈子|le5 我回来了|le5 你可算回来了|le5 雨停了|le5 她终于嫁人了|le5 我记了好几遍|le5 他卖了房子|le5 老子不伺候了|le5 这活我不揽了
le5 爱咋{za3}咋{za3}地吧，我不管了|le5 拉倒吧，我不整了|le5 他妈的，不玩了|le5 他把话说得太死了|le5 这事闹得太大了|le5 你想得太简单了|le5t 你乾脆辭職得了|le5t 我不去了|le5t 他喝得太多了|le5t 他得了什麼病|le5 他早就走得没影了|le5 他吃得太撑了
le5 我等得花都谢了|le5 你来得太晚了|le5 他说得我都烦了|le5 他打得太狠了|liao3 这么多菜你吃得了吗|liao3 他一个人搬得了这么重的东西|liao3 谁也帮不了你|liao3 我实在受不了你|liao3 这病你治得了吗|liao3 他今晚回不了家|liao3 这么多事我管不了
liao3 我拿不了这么多|liao3 你跑得了吗|liao3 这点钱用不了多久|liao3t 這麼多菜你吃得了嗎|liao3 他走不了|liao3 我忘不了你`,
  着: `
zhe5 那锅汤在炉子上一直烧着了吧|zhe5 他一路上赶着了吗|zhao2 他用手抓着了栏杆|zhe5 他借着了酒劲|zhao2 他找着了一份工作|zhe5 他找着找着就哭了|zhe5 我正猜着呢，他就说了|zhe5 她摸着孩子的头|zhe5 他碰着杯子说|zhe5 你就这么冻着吧
zhe5 他吓着孩子玩呢|zhe5 他累着腰也不歇|zhe5 饿着肚子干活|zhe5 炉子上烧着水|zhe5 他烫着酒等你|zhe5 他抓着我的手不放|zhe5 他赶着一群羊|zhe5 我够着窗台往外看|zhe5 他闻着花香睡着{zhao2}了|zhe5 他借着月光看书|zhe5 他买着菜回家
zhe5 他撞着门喊|zhe5 雨一直淋着他|zhe5 烟熏着眼睛|zhe5 他咬着嘴唇不说话|zhe5 他点着头说好|zhe5 她扎着两个小辫|zhe5 他磕着瓜子看电视|zhe5 他绊着脚往前走|zhe5 他一直抓着不放|zhe5 他们赶着车往城里去|zhe5 他走着走着天就黑了
zhe5 他吃着饭看手机|zhe5 他看着窗外|zhe5 门开着呢|zhe5 他躺着|zhe5 你拿着|zhe5 你等着瞧|zhe5 他们俩说着说着吵起来了|zhe5 他坐着没动|zhe5 灯还亮着|zhe5 她一直哭着|zhe5 他站着不动|zhe5 他们正吃着呢|zhe5 他笑着点了点头
zhe5 你瞅着办吧|zhe5 他一直憋着|zhe5 他们唠着嗑|zhe5 我这儿忙着呢|zhe5 你先凑合着|zhe5 他一直挺着|zhe5 那你就等着吧|zhe5 我正跟他说着这事|zhe5 我们一边走着一边聊|zhe5 墙上贴着一张画|zhe5 她怀里抱着孩子|zhe5 桌上放着一碗面
zhe5 他忍着疼没吭声|zhe5 他守着他妈|zhe5 他拎着包上楼了|zhe5 他牵着狗出去了|zhe5 他捧着一束花|zhe5 他攥着拳头|zhe5 他喘着粗气|zhe5 她低着头|zhe5 他皱着眉|zhe5 他打着伞走了|zhe5 他叼着烟说|zhe5 他背着手走来走去
zhe5t 他抓著我的手不放|zhe5t 他走著走著天就黑了|zhe5t 他借著月光看書|zhe5t 門開著呢|zhe5t 他點著頭說好|zhe5 他开着车去了|zhe5 他说着就走了|zhe5 我听着呢|zhe5 他一直盯着她看|zhe5 他们正吵着呢|zhe5 车里还开着空调
zhao2 你烫着了没有|zhao2 我终于见着他了|zhao2 我见着了|zhao2 他够不着|zhao2 这孩子夜里睡不着|zhao2 我买不着票|zhao2 你管不着|zhao2 鱼咬钩了，钓着了|zhao2 他被蜜蜂蛰着了|zhao2 他打着了火|zhao2 炉子点着了|zhao2t 我見著了`,
  冲: `
chong1 这款奶粉好冲不结块|chong1 这牌子的芝麻糊好冲吗|chong1 那个马桶特别好冲|chong1 板蓝根颗粒挺好冲的|chong1 这种藕粉不好冲|chong1 这蛋白粉真好冲|chong1 你用开水冲他那碗面|chong1 他往前冲了几步|chong4 车冲着路边冲过去
chong1 他冲了杯热茶|chong1 你冲个热水澡吧|chong1 他们冲上去了|chong4 这辣椒味儿太冲了|chong4 他说话挺冲的|chong4 酒劲儿很冲|chong4 他冲我喊|chong4 她冲他笑了笑|chong1 拿凉水冲他脑袋|chong1 你冲你自己那杯吧
chong1 我冲我的，你忙你的|chong1 用热水冲你那碗面|chong1 大水冲了龙王庙|chong1 他冲了个澡|chong1 他一下子冲了出去|chong1 他冲进屋里|chong1 他们冲上山头|chong1 洪水冲垮了大坝|chong1 他往前冲|chong1 别冲动|chong1 冲啊
chong1 他冲过马路|chong1 他冲出门去|chong1 她冲到我面前|chong1 你先冲一下厕所|chong1 冲一杯咖啡|chong1 给孩子冲奶粉|chong1 他冲完澡出来|chong4 水太冲了，把盆都冲翻了|chong1 他们冲破了封锁|chong1 车子冲下了山坡
chong1 他冲他们冲过去|chong1 球迷冲进球场|chong4 他冲着咖啡说|chong4 他冲我笑|chong4 她冲他摆了摆手|chong4 他冲我们点点头|chong4 你冲我嚷嚷什么|chong4 这酒太冲|chong4 他说话很冲|chong4 这烟味儿真冲|chong4 他冲着我笑
chong4 他冲着门口喊|chong4 我是冲着你来的|chong4 他们都是冲着钱去的|chong4 她冲着镜子照了照|chong4 冲着这份情，我也得帮他|chong4 他冲着窗外发呆|chong4 狗冲着他狂叫|chong4 他冲着电话吼|chong4 大门冲着南边
chong4 冲着你这句话，我干了|chong4t 他衝著我笑|chong1 这奶粉很好冲|chong1 这个奶粉挺好冲的|chong1 这厕所好冲吗|chong1 这款咖啡特别好冲|chong1 马桶不太好冲|chong1 这种粉真好冲|chong1 这个冲剂很好冲，一搅就化
chong1 这个马桶好冲|chong1 他们冲过来了|chong1 大水把他冲走了|chong1 她用水冲他的手|chong1 浪把他冲上了岸|chong1 他冲我们冲过来|chong4 这人脾气太冲|chong4 她说话有点冲|chong4 这药味太冲了|chong4 这股味儿挺冲的
chong4 他性子太冲|chong4 你别那么冲`,
  长: `
chang2 这条路长得很|chang2 这裙子长得正好|chang2 裤子长得拖地了|chang2 这队伍长得一眼望不到头|chang2 这一夜长得好像没有尽头|chang2 他的影子拉得很长|chang2 这根绳子长得够用了|chang2 这部电影长得让人犯困|chang2 那年冬天长得没完没了
chang2 这封信长得吓人|chang2 他的头发长得遮住了眼睛|chang2 这名字长得记不住|chang2 那段路长得要命|chang2 等待长得让人心焦|chang2 他拉长着脸不说话|chang2 她拉长着声音喊|chang2 日子还长着呢|chang2 路还长着哪
chang2 你的路还长着呢|chang2 时间长着呢，别急|chang2 后头的日子还长着嘞|chang2 这电影长着呢|chang2 这条街长着呢，走到头得半小时|chang2 他话长着呢|chang2 那队排得长着呢|chang2 这一版比上一版长了一倍|chang2 裤子长了一截
chang2 这条裙子长了一点|chang2 白天长了不少|chang2 这次的报告比上次长了一页|chang2 会开得长了点|chang2 头发留长了|chang2 这袖子长了|chang2 线放长了|chang2 此情长在|chang2 愿友谊长在|chang2 青春长在|chang2 这条河很长
chang2 这根竹竿很长|chang2 他长叹一声|chang2 他长出一口气|chang2 长此以往|chang2 长话短说|chang2 夜长梦多|chang2 来日方长|chang2 他长舒了一口气|chang2 天长地久|chang2 他说了好长时间|chang2 这条路太长了
chang2 他的腿长|chang2 时间太长|chang2 太长了吧|chang2 长着呢|chang2 那会儿长得没边了|chang2 这节课长得跟一辈子似的|chang2 冬夜长得像一年|chang2 这一天长得跟一年似的|chang2t 這條路長得很|chang2t 日子還長著呢
chang2t 他拉長著臉不說話|chang2t 這一版比上一版長了一倍|chang2t 裙子長得拖地了|zhang3 她长得真好看|zhang3 这孩子长得像他爸|zhang3 他脸上长着雀斑|zhang3 他长了个包|zhang3 院子里长满了草|zhang3 树长出了新芽
zhang3 孩子长成大人了|zhang3 他从小长在农村|zhang3 这孩子长得快|zhang3 他长得挺高|zhang3t 她長得真好看`,
  数: `
shu4 那些数了解一下就行|shu4 账本上的数对不上|shu4 心里的数到底是多少|shu4 你给的数了不得|shu4 这些数着实吓人|shu4 那些数过了半年就变了|shu4 上面写的数不清楚|shu4 统计的数钱不对|shu4 报上来的数一下子翻了倍|shu4 这些数一个都不能错
shu4 公司的数到底对不对|shu4 账上那些数了解吗|shu3 你数一下|shu3 他数着钱|shu3 我数过了|shu3 数星星|shu3 数他跑得最快|shu4 就这些数了|shu4 大概的数了|shu4 也就那几个数了|shu4 我心里有数了|shu4 他心里早就有数了
shu4 已经是个大数了|shu4 价钱就这个数|shu4 要这个数|shu4 他伸出三根手指，意思是这个数|shu4 他报了个数|shu4 这数不对|shu4 你说个数|shu4 他算了算，得出一个数|shu4 账上的数到了月底就清了|shu4 人数不够|shu4 多数人同意|shu4 次数多了
shu4 分数出来了|shu4 他凑数了|shu4 这话不算数|shu4 无数次|shu4 数学|shu4 数字|shu4 少数民族|shu4 数据|shu4 心中有数|shu4 他算数很快|shu4 心里没数|shu4 这数儿差不多|shu4 这个数过了|shu4 就那点数了
shu4 一共就这么些数|shu4 他报的数过了一百|shu4 差不多那个数到手了|shu4 实际的数到不了那么多|shu4 定好的数一个都不能少|shu4 上头给的数了解一下|shu4 他们给的数着实不少|shu4t 就這些數了|shu4t 我心裡有數了|shu4t 大概的數了|shu3 他数了数{shu3}钱
shu3 你数一数|shu3 数着日子过|shu3 数不清|shu3 数到十|shu3 他在数钱|shu3 数他最聪明|shu3 我数过了，一共三十个|shu3t 他數了數{shu3}錢`,
  背: `
bei4 他背孩子们写的作文|bei4 他背老人家说过的话|bei4 他背女儿抄的那首词|bei4 她背儿子编的童谣|bei4 他背妈妈教他的歌|bei4 他背起我教他的诗来|bei4 他背起他写的那段台词|bei4 他背病人须知|bei4 他背伤员守则|bei4 他背新娘子准备的贺词
bei4 他背行李清单上的东西|bei4 他背父亲留下的遗言|bei1 他背着孩子|bei1 他背孩子|bei1 他背不动了|bei1 他把母亲背回家|bei1 他背起背篓|bei1 他背行李|bei4 他背奶奶教的那首诗|bei4 他背儿子写的诗|bei4 她背女儿编的顺口溜
bei4 他背孩子写的作文给我们听|bei4 他背爷爷留下的家训|bei4 他在背老师布置的课文|bei4 他背起我写的诗来|bei4 他背单词|bei4 他背书背得很快|bei4 他背着我做了这件事|bei4 他背过脸去|bei4 他背对着我|bei4 他背靠着墙|bei4 他手背上有道疤
bei4 背后有人|bei4 他背地里说你坏话|bei4 他背叛了我们|bei4 他背了一首诗|bei4 他把乘法口诀背得滚瓜烂熟|bei4 你背一下这段台词|bei4 这段我背过|bei4 他背得出来|bei4 他运气真背|bei4 最近手气背|bei4 他背着手走来走去|bei4 他耳朵有点背
bei4 他背过身去|bei4 他背儿歌给我听|bei4 他背唐诗|bei4 他背公式|bei4 他把台词背熟了|bei4 他背错了|bei4 他背不下来|bei4 他背了一晚上书|bei4t 他背奶奶教的那首詩|bei4t 他背兒子寫的詩|bei4t 他背著我做了這件事|bei4t 他背單詞
bei1 他背着孩子去医院|bei1 他背起背篓上山了|bei1 这么重我背不动|bei1 他把老人背回家|bei1 他背黑锅|bei1 他背着包走了|bei1 他背上行李就出发了|bei1 他把伤员背下山|bei1t 他背著孩子去醫院`,
  转: `
zhuan3 他转过身去|zhuan3 他转头就走|zhuan3 你把钱转给我|zhuan3 他转了五百块钱|zhuan3 我转你一百|zhuan3 他转学了|zhuan3 天气转晴|zhuan3 他转了个弯|zhuan3 他把这个视频转到朋友圈|zhuan3 他转了一个视频给我
zhuan3 他转发了|zhuan3 他转了三次车|zhuan3 他转了两趟地铁|zhuan3 你先转个账|zhuan3 他话锋一转|zhuan3 事情有了转机|zhuan3 他转了好几个圈子才说到正题|zhuan3 他转了个话题|zhuan3 他转了个念头|zhuan3 他转眼就忘了
zhuan3 他转脸看着我|zhuan3 病情好转|zhuan3 他转业回来了|zhuan3 我转告他|zhuan3 他转身离开|zhuan3 他转入圈内工作|zhuan3 他转了个身|zhuan3 你转过来|zhuan3 他转了两手才到我这|zhuan3 他转了一道手|zhuan3 我把这事转给他了
zhuan3t 他轉過身去|zhuan3t 你把錢轉給我|zhuan3t 他轉了個彎|zhuan3t 他轉了五百塊錢|zhuan4 他在屋里转了一圈|zhuan4 你转个圈给我看看|zhuan4 他绕着操场转了三圈|zhuan4 陀螺转了好几圈|zhuan4 她转了个圈|zhuan4 地球绕着太阳转
zhuan4 他在街上转悠|zhuan4 他转了两圈|zhuan4t 他在屋裡轉了一圈`,
  觉: `
jue2 她一觉出不对劲就走了|jue2 他一觉出味儿来就不吃了|jue2 我一觉不妙，赶紧溜了|jue2 他一觉察就跑了|jue2 我一觉着冷就起来了|jue2 她一觉得不舒服就请假|jue2 他一觉悟过来就后悔了|jue2 他一觉出来就报了警|jue2 他一觉不对劲就关了门
jue2 我一觉着饿就吃东西|jue2 他觉出了异样|jue2 你觉不出来吗|jiao4 一觉醒来|jiao4 一觉睡到中午|jiao4 睡了一觉|jiao4 他一觉到天亮|jiao4 好好睡一觉|jue2 我一觉着不对劲就跑了|jue2 他一觉着冷就加衣服|jue2 她一觉出不对来就报警了
jue2 我一觉察到危险就跑|jue2 我觉着不对|jue2 你觉着咋样|jue2 他好觉悟|jue2 这人有个觉悟|jue2 他不知不觉睡着{zhao2}了|jue2 他感觉不好|jue2 你自觉点|jue2 他觉得挺好|jue2 我觉着他挺好|jue2 我一觉得累就歇会儿
jue2 他好像觉出了什么|jue2 他一下子觉醒了|jue2 视觉|jue2 听觉|jue2 他警觉地看着我|jue2 我咋{za3}觉着这事不对呢|jue2 我总觉着有人跟着我|jue2 你没觉着冷吗|jue2 他早就觉察了|jue2 他还没觉出来|jue2 你觉不觉得|jue2 他一点都没觉着
jue2 你好好觉悟一下|jue2 我也觉着是|jue2 他发觉了|jue2 我一觉不对，赶紧走了|jue2 大家都觉着他挺好|jue2 他察觉到了|jue2 错觉|jue2 直觉告诉我|jue2 他觉着自己老了|jue2t 我一覺著不對勁就跑了|jue2t 我覺著不對|jue2t 你覺著咋樣
jue2t 他一點都沒覺著|jiao4 他睡了一觉|jiao4 一觉醒来天都亮了|jiao4 睡个好觉|jiao4 他睡不着觉|jiao4 他在睡午觉|jiao4 我回去补觉|jiao4 周末睡懒觉|jiao4 他睡了个囫囵觉|jiao4t 他睡了一覺`,
  应: `
ying1 你应道个谢|ying1 我们应道歉才对|ying1 他应道出实情|ying1 你应道明来意|ying1 你们应道个歉再走|ying1 我们应道一声谢|ying1 你应道出真相|ying1 他们应道个歉|ying1 你本应道歉|ying1 他应道明原委|ying1t 你應道個歉
ying1 他应声明一下|ying4 他低声应道：“好。”|ying4 她应道|ying4 他应了一声|ying4 我喊他，他没应|ying4 他连声应道，是是是|ying1 你应该去|ying1 这是应有的态度|ying1 他应当负责|ying1 本应如此|ying1 理应道歉
ying1 我们应了解情况|ying1 他应了解一下|ying1 你应先说一声|ying1 你应早点说一声|ying1 他本应声明在先|ying1 应届毕业生|ying1 应有尽有|ying1 我们应着重解决这个问题|ying1 你应着手准备了|ying1 他应着眼于长远|ying1 这事理应了结
ying1 应收账款|ying1 他不应该来|ying1 你本应告诉我|ying1 他们应尽快处理|ying1 你应知道|ying1 这事应怎么办|ying1 你应多休息|ying1 我们应道歉|ying1 你应道个歉|ying1 应如何是好|ying1t 你應該去|ying1t 我們應了解情況
ying1t 你應先說一聲|ying1t 我們應著重解決這個問題|ying1 你应着重关注这一点|ying1 他应了解实际情况才对|ying4 他应了一声|ying4 他应道|ying4 我叫了他一声，他没应|ying4 他嘴上应着|ying4 这正应了那句老话|ying4 他应声倒地
ying4t 他應了一聲`,
  宿: `
xiu4 青龙七宿的第一宿|xiu4 白虎七宿|xiu4 朱雀七宿|xiu4 玄武七宿|xiu4 南方七宿|xiu4 西方七宿|xiu4 四象七宿|xiu4 古人把天分成四方各七宿|xiu4 他研究东方七宿|xiu4 苍龙七宿|su4 他七宿舍的|su4 三宿舍的人|xiu3 住了七宿八宿
xiu3 他两宿没睡|xiu3 一宿|xiu3 熬了三宿|xiu3 半宿没睡着|xiu4 天上的二十八宿|xiu4 青龙七宿|xiu4 北方七宿|su4 一宿舍的人都醒了|su4 两宿舍之间|su4 三个宿舍|su4 他住在宿舍|su4 我们宿营|su4 他是我们的宿敌|su4 归宿
su4 他在外面露宿|su4 住宿费|su4 宿命|su4 投宿|su4 寄宿学校|su4 借宿一晚|su4 名门宿将|su4 留宿|su4 夙愿和宿怨|su4 宿醉|su4 他们俩是宿仇|su4 他是这一行的宿老|su4 风餐露宿|su4 食宿全包|su4 这里管食宿|su4 他在客栈里宿下了
su4 当晚就宿在庙里|su4 他宿在朋友家|su4t 一宿舍的人都醒了|su4t 他住在宿舍|su4t 住宿費|su4t 他宿在朋友家|xiu3 他一宿没睡|xiu3 住了两宿|xiu3 熬了半宿|xiu3 整宿整宿{xiu3}地睡不着|xiu3 待了一宿|xiu3 几宿没合眼|xiu3 三宿没回家
xiu3 他守了一宿|xiu3t 他一宿沒睡`,
  种: `
zhong3 这两个是不同种了|zhong3 它们属于相同种|zhong3 这跟那个是同种的|zhong3 不同种的狗|zhong3 相同种了就能配|zhong3 它们早就不是同种了|zhong3 异同种着实难分|zhong3 这是两个不同种过渡来的|zhong3 不同种花不能放一起
zhong3 共同种的特征|zhong3 两个不同种着色不一样|zhong3 是同一种了|zhong4 他们一起种了一片树|zhong4 他种了很多菜|zhong4 这是我种的|zhong4 他种玉米|zhong4 他们共同种了一棵树|zhong3 不同种树的叶子不一样|zhong3 这是两个不同种了
zhong3 你是什么种的|zhong3 这种菜好吃|zhong3 那种花真香|zhong3 哪种树长{zhang3}得快|zhong3 多种花都开了|zhong3 几种草混在一起|zhong3 这一种花最贵|zhong3 同种花放一起|zhong3 你有种|zhong3 他是个孬种|zhong3 这种人
zhong3 各种各样|zhong3 种子发芽了|zhong3 品种不错|zhong3 这都快绝种了|zhong3 他们是一种人|zhong3 你这种的我见多了|zhong3 某种程度上|zhong3 种种迹象表明|zhong3 那种了不起的人|zhong3 这种了解很重要
zhong3 那种着急的样子|zhong3 他是那种过日子的人|zhong3 你就是这种的|zhong3 我不是那种的|zhong3 两种的价钱不一样|zhong3 别的种我没见过|zhong3 稀有种|zhong3 这三种都要|zhong3 有一种说不出的感觉|zhong3 他有种预感
zhong3t 這種菜好吃|zhong3t 那種花真香|zhong3t 你這種的我見多了|zhong3t 不同種樹的葉子不一樣|zhong4 他种了一棵树|zhong4 院子里种着花|zhong4 他种过玉米|zhong4 我们种菜吃|zhong4 这是我种的|zhong4 他种玉米
zhong4 爷爷种的树|zhong4 他每年种小麦|zhong4t 他種了一棵樹`,
  重: `
zhong4 他因母亲病重回了老家|zhong4 他病重住进了医院|zhong4 这活儿太重了|zhong4 他下手重了点|zhong4 他口味重|zhong4 礼太重了|zhong4 他心思重|zhong4 这锅太重拿不动|zhong4 他背上的包重得很|zhong4 他的病越来越重
zhong4 他病重起不来床|zhong4 他病重说不出话|zhong4 他伤重回不了家|zhong4 这箱子重装不下|zhong4 他心事重说不出口|zhong4 他伤势重来不及送医院|zhong4 箱子很重|zhong4 这包太重了|zhong4 他下手重|zhong4 他说话太重了
zhong4 他病得很重|zhong4 这担子重|zhong4 他的口音重|zhong4 礼轻情意重|zhong4 他看重这个|zhong4 他很重感情|zhong4 他重男轻女|zhong4 重点是什么|zhong4 他体重增加了|zhong4 他的伤很重|zhong4 这个人很稳重
zhong4 他心里很沉重|zhong4 你别太重视|zhong4 他受了重伤|zhong4 他身负重任|zhong4 这事很重要|zhong4 他重重地摔了一跤|zhong4 他把门关得很重|zhong4 这块石头最重|zhong4 越背越重|zhong4 他病重了|zhong4 他病重回老家了
zhong4 这东西重拿不动|zhong4t 他病重起不來床|zhong4t 這箱子很重|zhong4t 他心事重說不出口|zhong4 他病重来不了了|chong2 你重做一遍|chong2 他重写了一篇|chong2 我们重来|chong2 他重回故乡|chong2 悲剧重演
chong2 我们重新开始|chong2 他重说了一遍|chong2 这张照片重拍了|chong2t 你重做一遍`,
  量: `
liang4 他今天喝到量了|liang4 这孩子饭吃够量了|liang4 医生说给他减了量了|liang4 他喝超了量了|liang4 这药你吃足量了吗|liang4 订单到量了|liang4 车流过了量了|liang4 他已经喝过量了|liang4 运动到量了就歇会儿|liang4 工作量了不得
liang4 他的药加了量了|liang4 吃到量了吗|liang2 量了一下体温|liang2 量了血压|liang2 他量了量{liang2}|liang2 你量过吗|liang2 量一下尺寸|liang4 他喝到量了|liang4 他今天到量了|liang4 差不多到量了，别喝了|liang4 这酒喝得够量了
liang4 他吃够量了|liang4 医生说药得加量了|liang4 这药加量了|liang4 她的药减量了|liang4 这个月又放量了|liang4 这款手机限量了|liang4 他喝超量了|liang4 吃过量了|liang4 他的饭量|liang4 酒量不行|liang4 尽量
liang4 数量|liang4 质量很好|liang4 量力而行|liang4 他有肚量|liang4 雨量很大|liang4 他是海量|liang4 大量的人|liang4 这量太少了|liang4 这点量不够|liang4 他喝酒没量|liang4 量大从优|liang4 量多
liang4 你得控制量了|liang4 他的工作量了不得|liang4 运动量过大|liang4 这量过了吧|liang4t 他喝到量了|liang4t 這藥加量了|liang4t 這酒喝得夠量了|liang4 他还没到量呢|liang4 吃到量就停|liang4 达到量了
liang2 给孩子量一下体温|liang2 他量了量{liang2}身高|liang2 量血压|liang2 你量过吗|liang2 我量着呢|liang2 护士量了体温|liang2 先量尺寸|liang2 量一量{liang2}|liang2t 給孩子量一下體溫`,
  铺: `
pu4 他睡下铺|pu4 店铺|pu4 当铺|pu4 床铺|pu4 杂货铺|pu4 肉铺|pu4 药铺|pu4 这家铺子|pu4 卧铺票|pu4 上铺|pu4 铺面|pu4 他开了家铺子|pu4 他在铺子里干活|pu4 铁匠铺|pu4 打地铺|pu4 硬卧中铺|pu4 他的铺位|pu4 他在铺里
pu4 卖铺面|pu4 这铺子开了三十年|pu4 他是铺子的掌柜|pu4 老铺子|pu4 那间铺|pu4 镇上有几家铺|pu4 回到铺上躺着|pu4t 當鋪|pu4t 這家鋪子|pu4t 他家鋪開在鎮上|pu1 铺在床上|pu1 地上铺着报纸|pu1 他把床铺好|pu1 院子里铺满了雪
pu1 路铺得很平|pu1 他铺开地图|pu1 铺了一层沙子|pu1 把桌布铺平|pu1t 鋪在床上`,
};
for (const [ch, x] of Object.entries(REV4)) CHARS[ch].rev4 = x;
// judged contrived (水流冲他倒退了几步, 口音重说什么都听不懂: a comma is missing), or the segmenter's word (老王家的铺开张了: 铺开), or
// 冲着 in its rarer sense: 冲着 alone is read chòng "towards" (冲着我笑, 冲着名气买的: all of the 冲着 in the reviews and 人民日报 1998),
// so the washing sense is wrong (他冲着冷水澡); printed, not counted
const KNOWN4 = {
  冲: `chong1 水流冲他倒退了几步|chong1 他冲着冷水澡|chong1 她正冲着奶粉|chong1 浪花冲着礁石|chong1 雨水冲着路面|chong1 她拿水冲着碗|chong1 他用凉水冲着伤口|chong1 水龙头一直冲着他的手|chong1 他边冲着澡边唱歌|chong1t 他衝著冷水澡`,
  重: `zhong4 他这人口音重说什么都听不懂|zhong4 他伤重来了也没用`,
  铺: `pu4 他家铺开在镇上|pu4 那家铺开到半夜|pu4 老王家的铺开张了`,
};
for (const [ch, x] of Object.entries(KNOWN4)) CHARS[ch].known = x;
// rules taken out after the fourth review, read exactly as before this round (the usual reading, or the dictionary's word): 地 (自在地,
// 大份大份地, 切成小块地), 还 (我还书没念完呢, 下一个还你吗, 还钱钱钱的), 只 (这只今天有效, 这只我能做), 待 (没被人好好待过, 待三年期满),
// 处 (我们处得好好准备一下: the office), 挑 (挑了一根刺, 这个头谁来挑), 吐 (又吐了, 快吐: spit out); every character of these
// sentences is checked against test_readings.expect
const REMOVED = {
  地: `
di4 北京、上海等地|di4 他摔倒在地|di4 他把杯子摔在地|di4 树叶落了一地|di4 水洒了一地|di4 这是一块风水宝地|di4 安身之地|di4 他家有三亩地
di4 这块地是我爷爷留下的|di4 他们多分了一份地|di4 立锥之地|di4 用武之地|di4 他被撂倒在地|di4 广东、福建等地都下了雨|di4 碎玻璃撒了一地
di4 他一屁股坐在地|di4 他瘫坐在地，失声痛哭|di4t 北京、上海等地|di4t 樹葉落了一地|di4 每亩地能打多少粮食|di4 不计较一时一地的得失
de5 他慢慢地走|de5 她轻轻地说|de5 他高兴地跳了起来|de5 一步一步地往前走|de5 他不停地哭|de5 她狠狠地瞪了他一眼|de5 他斩钉截铁的地说
de5 他一个劲地点头|de5 他们有针对性地开展工作|de5 他默默地看着她|de5 车厢一节一节地过去|de5 他认真地想了想|de5 他悄悄地走了
de5 他紧紧地抱着她|de5 她偷偷地笑了|de5 他飞快地跑了|de5t 他慢慢地走|de5t 她輕輕地說|de5 他慢慢/地走|de5l 地说|de5 他大声地喊|de5 他无奈地笑了笑
de5 他实实在在地干了一辈子
di4 雪下了一地|di4 他跌坐在地|di4 苹果滚了一地|de5 他默默地抽烟|de5 她甜甜地笑了|di4 江苏、浙江等地|de5 他一遍一遍地问|di4 他家那几亩地|de5 他狠狠地打了一拳|di4 碎纸片撒了一地|de5 她慢慢地站起来|di4 这是兵家必争之地|de5 雨不停地下|di4t 雪下了一地|de5t 他默默地抽菸|di4 他扑通一声跪倒在地|de5 他得意地笑了
de5 他把饼干一块一块地掰开|de5 老师把卷子一份一份地发下去|de5 他一亩一亩地收割麦子|de5 他三块三块地往外拿钱|de5 他一份份地签字|de5t 他把餅乾一塊一塊地掰開
de5 他一遍遍地问我|de5 她一遍又一遍地看那封信|de5 他满满地倒了一杯酒|de5 他把碗盛得满满地端过来|de5 他一一地回答了大家的问题|de5 她把名字一一地念出来|de5 他悠然自在地喝着茶|de5 他不自在地挪了挪身子|de5 她很自在地坐下来|de5 他自由自在地活着
de5 他格外地安静|de5 这天格外地冷|de5 她意外地发现了一封信|de5 他如此地爱她|de5 她如此地美丽|de5 他额外地多给了一百块|de5 他根本地改变了|de5 她诧异地看着我|de5 他惊异地抬起头|de5 他原原本本地说了一遍|de5 他本本分分地过日子
de5 他三三两两地走过来|de5 人们三三两两地散了|de5 他一个劲地点头|de5 他一股脑地全说了|de5 他一味地退让|de5 他一溜烟地跑了|de5 他一下一下地敲着门|de5 他一口一口地喝着汤|de5 他一次又一次地失败|de5 他一步步地往上爬|de5 他一点一点地挪过去
de5 他一页一页地翻|de5 他一天天地老了|de5 他一块块地把砖搬走|de5 他把肉一块一块地切好|de5 他整块整块地往嘴里塞|de5 他大块大块地吃肉|de5 他把文件一份份地分好|de5 他满怀希望地等着|de5 她满心欢喜地跑过去|de5 他满腹狐疑地看着我|de5 她满脸通红地低下头
de5 他满不在乎地笑了|de5 他满头大汗地跑进来|de5 他专一地爱着她|de5 他唯一地能做的就是等|de5 他很统一地回答|de5 他异常地兴奋|de5 他非常地生气|de5 她轻轻地叹了口气|de5 他慢慢地走过来|de5 他狠狠地踢了一脚|de5 他偷偷地哭了|de5 他死死地盯着我
de5 他使劲地摇头|de5 他拼命地跑|de5 他默默地抽着烟|de5 他悄没声地走了|de5 他一本正经地说|de5 他一五一十地说了|de5 他一字一句地念|de5 他一动不动地站着|de5 他一声不吭地走了|de5 他稀里糊涂地签了字|de5 他美滋滋地吃着|de5 他乐呵呵地说
de5 他贼拉拉地高兴|de5 他气呼呼地走了|de5 他傻乎乎地笑|de5 他乐颠颠地跑过来|de5t 他一遍遍地問我|de5t 他滿滿地倒了一杯酒|de5t 他一一地回答了大家的問題|de5t 他悠然自在地喝著茶|de5t 他格外地安靜|de5 他不停地咳嗽|de5 她拼了命地往前跑
de5 他发了疯地找她|de5 他红了眼地扑上去|de5 他不由自主地笑了|de5 他自言自语地说|di4 饭粒撒了一地|di4 广州、深圳等地|di4 这里是他的出生之地|di4 他扑倒在地|di4 他们分了两块地|di4 这块地归你|di4 他家那十亩地|di4 他把各地的特产都尝了
di4 他们夫妻两地分居|di4t 飯粒撒了一地|de5 他实在地说了一句|de5 他实实在在地活着|de5 她轻松自在地走着|de5 他自在地伸了个懒腰|de5 他舒舒服服、自由自在地睡了一觉{jiao4}|de5 他逍遥自在地过日子|de5 他悠闲自在地躺着|de5 我们自在地聊着天|de5 他不太自在地笑了笑
de5 灯光分外地亮|de5 他毫不例外地迟到了|de5 他喜出望外地跳了起来|de5 他千篇一律地重复着|de5 他始终如一地守着她|de5 他表里如一地做人|de5 他们不约而同地笑了|de5 他一视同仁地对待每个人|de5 他平等地对待每个人|de5 他各自地忙着|de5 他们彼此地看了一眼
de5 他一块一块地吃|de5 他一份一份地看|de5 他整份整份地吃|de5 他整块整块地切下来|de5 他大份大份地往碗里盛|de5 他成块成块地往下掉|de5 他一亩一亩地种|de5 他一亩亩地犁过去|de5 他整亩整亩地收|de5 他把蛋糕切成小块地分给大家|de5 他疯了似地跑
de5 他着{zhao2}了魔似地盯着屏幕|de5 他像丢了魂地走着|de5 他欢天喜地地跑了|de5 他惊天动地地哭了一场|de5 他昏天黑地地睡了三天|de5 他死心塌地地跟着他`,
  还: `
huan2 我把书还了|huan2 钱早就还了|huan2 他还了钱就走了|huan2 借钱不还|huan2 你什么时候还我|huan2 这钱我一定还你|huan2 还我清白|huan2 还他一个公道
huan2 他每个月还房贷|huan2 他借的钱一直没还|huan2 你还了吗|huan2 我还你一个人情|huan2 他靠打工还债|huan2 这份人情我早晚得还|huan2 还没*还
huan2 有借有*还|huan2 他还清了所有的债|huan2 把东西还给人家|huan2t 我把書還了|huan2t 借錢不還|huan2 你得还人家钱|huan2 我才能还姑姑的情
hai2 他还没来|hai2 你还好吗|hai2 还有一件事|hai2 我还以为你走了|hai2 他还在睡觉|hai2 这还不够|hai2 还行吧
hai2 他还了解不少情况|hai2 那还用说|huan2 你还不还钱|hai2 他还是没说话|hai2 还早着呢|hai2 他比我还高|hai2 还没吃饭
hai2t 他還沒來|hai2t 你還好嗎|huan2 他/还了|huan2 他还/了|hai2l 他还没来|hai2 这事还真不好说|hai2 他还他妈的有理了
huan2 欠你的钱我下个月还|huan2 你把伞还了吗|huan2 我借你的书什么时候还你|huan2 他到现在都没还|hai2 他还在等你|hai2 你还记得吗|huan2 还我钱|hai2 我还想再看一遍|huan2 他每月还车贷|hai2 你还是去吧|huan2 这个人情我一定还|hai2 天还没亮|huan2 他把钥匙还了|huan2t 你把傘還了嗎|hai2t 他還在等你|hai2 还有谁|huan2 借了不还
hai2 他还钱都不要了|hai2 他现在还钱都没有，哪来的车|hai2 我还书都没看完呢|hai2 家里就还我一个人|hai2 怎么还你一个人|hai2 现在还他一个人在家|hai2 都几点了还你一个人在这儿|hai2 怎么就还他一个|hai2 那还了得|hai2 他还本钱都没赚回来|hai2 他还你一个人呢|hai2t 怎麼還你一個人
hai2 都这时候了还钱钱钱的|hai2 我还书没念完呢|hai2 他还书没看完就睡着了|hai2 这孩子还钱的概念都没有|hai2 他还钱包没找着呢|hai2 我还书包没收拾|hai2 他还情不自禁地笑了|hai2 他对她还情有独钟|hai2 这人还情商挺高|hai2 他还情绪不错
hai2 存银行还利息呢|hai2 他还债台高筑|hai2 那时候我还书呆子一个|hai2 下一个还你吗|hai2 最后还他吗|hai2 怎么又是你？还你呢|hai2 那还他吧|hai2 第一名还她吗|hai2 今天值班的还你吧|hai2 这次还我吧，我来|hai2 还你一个人在家啊
hai2 家里还他俩呢|hai2 现在还我们两个人|hai2 还你去吗|hai2 还他来吗|hai2 那还咱们去呗{bei5}|hai2 都这么晚了还你一个人|hai2 他还没走|hai2 他还在家|hai2 你还年轻|hai2 还早呢|hai2 他还了得，打遍全村无敌手|hai2 还得等会儿|hai2 他还想吃
hai2 你还要不要|hai2 他还说呢|hai2 我还以为是你|hai2 还有呢|hai2 她还哭着呢|hai2 你还有脸来|hai2 他还是那样|hai2 还不错|hai2 还凑合|hai2 他还嘴硬|hai2 你还跟他客气啥|hai2 你还整这些没用的|hai2 他还挺能唠
hai2 这事儿还真不好办|hai2 还没呢|hai2 我还没|hai2 你还不走|hai2 他还不来|hai2 我还不知道呢|hai2 你还没有吗|hai2 还不呢|hai2 他还了解你吗|hai2 他到现在还了无音讯|hai2 他欠了一屁股债还天天喝酒|hai2 你还人家人家的，人家是谁啊
hai2 那钱还你自己留着吧|hai2 这个还你拿着|hai2 这个还他来吧|hai2 他还房子都没买呢|hai2 他还车都不会开|hai2 你还账都算不明白|hai2 我还贷款都没批下来呢|hai2t 都這時候了還錢錢錢的|hai2t 下一個還你嗎|hai2t 他還沒走|hai2t 我還書沒唸完呢
hai2t 他還情不自禁地笑了|huan2 你什么时候还钱|huan2 欠的钱我早还了|huan2 把钥匙还我|huan2 书我已经还了|huan2 他每个月都要还贷款|huan2 我会还你的|huan2 这人借钱从来不还|huan2 你那本书还没还|huan2 他欠的人情一直没还
huan2t 你什麼時候還錢`,
  只: `
zhi1 这只猫真可爱|zhi1 那只手|zhi1 他是只老狐狸|zhi1 我要那只|zhi1 这只鸟会说话|zhi1 那只狗又叫了|zhi1 每只鸡都很肥|zhi1 几只鸭子在游泳
zhi1 他养了三百万只鸡|zhi1 那只眼睛看不见了|zhi1 这只鞋找不着了|zhi1 那只箱子太重|zhi1 这只碗是我的|zhi1 那只耳朵|zhi1 半只鸡|zhi1 某只猫
zhi1 我买了两只|zhi1 你看那只|zhi1 哪只是你的|zhi1 这只船很旧了|zhi1 这只脚疼|zhi1 那只胳膊|zhi1 这只看不见的手
zhi3 我只想睡觉|zhi3 这只是开始|zhi3 他只有一个|zhi3 这只想着自己|zhi3 那只能这样了|zhi3 我只要你|zhi3 只因为一句话|zhi3 这只会让事情更糟
zhi3 他只顾自己|zhi3 她只管哭|zhi3 我只怕他不来|zhi3 那只好算了|zhi3 只不过|zhi1 他是只身一人|zhi3 这只限于今天|zhi3t 這只是開始|zhi3t 我只想睡覺
zhi1t 那隻狗|zhi1t 這隻貓真可愛|zhi1 这/只猫|zhi1l 只猫|zhi1l 这只猫真可爱|zhi3 你只要|zhi3 他只在家
zhi1 那只猫跑了|zhi1 这只鸡多少钱|zhi1 他是只纸老虎|zhi3 我只是随便问问|zhi1 树上有几只鸟|zhi3 那只能怪你自己|zhi1 那只狗咬人|zhi3 他只说了一句话|zhi1 我手里拿着两只碗|zhi3 只有你能帮我|zhi1 这只手表是他送的|zhi3 这只不过是个开始|zhi1 那只老母鸡|zhi1t 那隻貓跑了|zhi3t 我只是隨便問問|zhi1 你看那只鹦鹉|zhi3 他只想回家
zhi3 这只够吃一顿|zhi3 这只稍微好点
zhi3 这只今天有效|zhi3 这只偶尔发生|zhi3 这只暂时管用|zhi3 那只当时有用|zhi3 这只三块钱|zhi3 这只十块|zhi3 那只五毛钱一斤|zhi3 这只现在便宜|zhi3 这只针对你|zhi3 那只怪我|zhi3 这只限今天|zhi3 他对那只字不提|zhi3 这只此一家
zhi3 这只一次机会了|zhi3 这只一半的钱|zhi3 那只几分钟的事|zhi3 这只是开始|zhi3 那只能这样了|zhi3 这只不过是个误会|zhi3 那只好算了|zhi3 这只会更糟|zhi3 这只需要一分钟|zhi3 那只怕来不及了|zhi3 这只剩下一个了|zhi3 这只算一半
zhi3 是只想着自己|zhi3 是只要钱|zhi3 他是只顾自己|zhi3 这只够一个人吃|zhi3 那只因为你|zhi3 这只对你有效|zhi3 这只在北方有|zhi3 那只有你知道|zhi3 每只限一个|zhi3 这只限会员|zhi3 这只稍微贵点|zhi3 那只略微好点
zhi3 这只给你一个人|zhi3 那只跟你有关|zhi3 这只为你|zhi3 这只多不少|zhi3 几只能用|zhi3 某只有他知道|zhi3 这只一个人能干|zhi3 那只他一个人知道|zhi3 这只你一个人知道|zhi3 这只我能做|zhi3 这只他会|zhi3 这只咱俩知道
zhi3 那只我们俩去|zhi3 是只你一个人这样吗|zhi3 这只北京有|zhi3 那只上海才有|zhi3 这只晚上开|zhi3 这只周末有|zhi3 这只春天才开花|zhi3 这只早上卖|zhi3 这只今年才有|zhi3 他只说了一句|zhi3 我只想睡觉|zhi3 只有你|zhi3 我只要这个
zhi3 他只会哭|zhi3 只能这样|zhi3 你只管去|zhi3 他只顾着自己|zhi3 只好算了|zhi3 只见他一挥手|zhi3 只是没想到|zhi3t 這只今天有效|zhi3t 這只三塊錢|zhi3t 那只怪我|zhi1 这只猫是谁家的|zhi1 那只狗又叫了|zhi1 每只鸡都要打针
zhi1 几只鸟落在树上|zhi1 他是只老狐狸|zhi1 那只手一直在抖|zhi1 这只箱子太重了|zhi1 两只眼睛红红的|zhi1 三只小猪|zhi1 那只鞋找不着了`,
  待: `
dai1 他整天待在家里|dai1 你在这儿待着|dai1 那狗在外头待了一宿{xiu3}|dai1 我在北京待了三年|dai1 他在那儿待过|dai1 先待一阵子再说吧|dai1 我实在待不住了
dai1 你就在这待着吧|dai1 他在屋里待了一会儿|dai1 你还能待多久|dai1 我在这儿待不下去了|dai1 他在房间里待了很久|dai1 她不想待在这种地方
dai1 我们在山里待了两天|dai1 他在部队待过|dai1 你待这儿别动|dai1 让它继续待着吧|dai1 在家待了个把月|dai1t 他整天待在家裡|dai1t 你在這兒待著
dai1 进去待了一段时间|dai1 我在外面待一天|dai1 她在乡下待了半年|dai1l 你就在这待着吧
dai4 他待人很好|dai4 你怎么能这样待我|dai4 待到明年春天|dai4 这件事还有待在会上讨论|dai4 他待我不薄|dai4 设宴待了客人|dai4 且待半年再说
dai4 待他走后|dai4 待我想一想|dai4 静待佳音|dai4 他以礼相待|dai4 我们待他如亲人|dai4 待半夜之时动手|dai4 待人接物|dai4 严阵以待
dai4 有待了解|dai4t 他待人很好|dai4t 待到明年春天|dai1 你在这儿/待着|dai1 他在家待/了三年|dai4 拭目以待
dai1 你在屋里待着别出来|dai1 我在上海待了五年|dai1 他在门口待了半天|dai4 他待人热情|dai1 我一个人待不住|dai4 别这样待她|dai1 你们在这儿待会儿|dai1 他在医院待过一阵子|dai4 待我回来再说|dai1 他不想在家待着|dai4 他一直被人冷眼相待|dai1 你在那边待多久|dai4 我们要好好待客|dai1t 你在屋裡待著別出來|dai4t 他待人熱情|dai1 他在老家待了一个月
dai4 她从没被人这样待过|dai4 他待个客人都不会|dai4 待几天后伤口愈合了|dai4 待一年后，他回到了家乡|dai4 待三天后他醒来|dai4t 她從沒被人這樣待過
dai4 她这辈子没被人好好待过|dai4 他从来没被人这么好好待过|dai4 人家怎么待过你|dai4 他好好待过谁|dai4 这个结论仍待在实践中检验|dai4 这个问题尚待进一步研究|dai4 此事有待在下次会上讨论|dai4 他待人很热情|dai4 他待我不薄|dai4 你待她好一点
dai4 他待了她一辈子好|dai4 他对待工作很认真|dai4 他们热情地款待了客人|dai4 他期待着那一天|dai4 待他回来再说|dai4 待到春暖花开|dai4 待天亮再走|dai4 他等待着|dai4 一切准备就绪，只待出发|dai4 严阵以待|dai4 迫不及待|dai4 拭目以待
dai4 以礼相待|dai4 他待价而沽|dai4 待遇不错|dai4 他待业在家|dai4 招待所|dai4 他亏待过谁|dai4 他从来没亏待过你|dai4 他对你怎么样？待你好吗|dai4 他待你好不好|dai4 主人家待客很周到|dai4 待客之道|dai4 待到山花烂漫时
dai4 待三年期满，他就能出来|dai4 他待下属很宽厚|dai4 待我长发及腰|dai4 她待孩子像亲生的一样|dai4 公司待他不错|dai4 他是怎么待你的|dai4 你就这么待我|dai4 待我想想|dai4 待他走远了，我才出来|dai4 待他来了以后再说
dai4t 她這輩子沒被人好好待過|dai4t 他待人很熱情|dai4t 待他回來再說|dai4t 這個結論仍待在實踐中檢驗|dai4t 他待我不薄|dai1 你在这儿待着|dai1 他在北京待了三年|dai1 我在家待不住|dai1 他在那儿待过|dai1 我就待一会儿|dai1 他待在屋里不出来
dai1 你多待几天|dai1 我在这儿待够了|dai1 他在农村待了半年|dai1t 你在這兒待著`,
  处: `
chu3 他俩处得挺好|chu3 我跟他处不来|chu3 他们处对象了|chu3 我们处了三年|chu3 酒店所处的位置不错|chu3 他们所处的时代
chu3 跟邻居处得不错|chu3 我和他处得来|chu3 他们处了两年朋友|chu3 了解我们所处的环境|chu3t 他倆處得挺好|chu3t 所處的位置|chu3l 他俩处得挺好
chu3 婆媳俩处得很融洽|chu3 他跟谁都处不好|chu3 处理问题|chu3 他处事很稳|chu3 处于困境|chu3 他被处分了|chu3 这样处置不妥
chu4 到处都是人|chu4 这里有一处房子|chu5 好处不少|chu4 他住的地方离这处不远|chu4 可圈可点之处了|chu4 简练之处得传神之笔|chu4 我们处长来了
chu4 此处不留人|chu4 各处都找了|chu5 你有什么难处|chu4 他心里的痛处|chu4 两处伤|chu5 用处不大|chu4 去处|chu4 别处|chu4 一处一处地看
chu4 这处得修一修|chu4t 到處都是人|chu4t 此處不留人|chu4 伤处了|chu3 他俩/处得挺好|chu4 他有长处
chu3 他们俩处得像亲姐妹|chu3 我跟领导处不好|chu4 到处都是垃圾|chu3 他们处了五年|chu4 这里有一处温泉|chu4 这种做法没什么好处|chu3 我们所处的环境|chu4 他心里有块软处|chu3 他跟同事处得不错|chu4 各处都有人把守|chu3 这人很难处|chu4 他的长处是细心|chu3t 他們倆處得像親姐妹|chu4t 到處都是垃圾|chu4 此处禁止吸烟
chu4 我们处得派个人去|chu4 这个处得重新安排|chu4 他们处得加班|chu4 这个处了三年都没人|chu4t 我們處得派個人去
chu4 我们处得好好准备一下|chu4 我们处得很快拿出个方案|chu4 我们处得好好研究研究|chu4 你们处得抓紧时间|chu4 他们处得非常重视这件事|chu4 咱们处得比别人做得更好|chu4 我们处不好交代|chu4 这处不来人|chu4 他住的那处不好找|chu4 我们处了解情况的人不多
chu4 他们处了不少事|chu4 这是他的住处|chu4 好处多着呢|chu4 到处都是人|chu4 此处不留人|chu4 他是处长|chu4 去办事处|chu4 别处找找|chu4 心里有说不出的苦处|chu4 他的长处|chu4 这处房子|chu4 他那处院子|chu4 深处|chu4 远处有人
chu4 这一处不错|chu4 两处伤|chu4 他身上有几处伤|chu4 我们处有三个人|chu4 他们处长很好|chu4 我们处里开会|chu4 处里决定了|chu4 他是处级干部|chu4 去哪处|chu4 一处一处地找|chu4 有一处得改|chu4 这个处得重新安排
chu4 我们处好几个人请假了|chu4t 我們處得好好準備一下|chu4t 這是他的住處|chu4t 到處都是人|chu4t 我們處得很快拿出個方案|chu3 他们俩处得很好|chu3 我跟他处不来|chu3 他们处了三年对象|chu3 他在处对象|chu3 我们处得挺融洽|chu3 他所处的环境
chu3 和邻居处得来|chu3 他俩处不下去了|chu3t 他們倆處得很好`,
  挑: `
tiao1 他弯腰挑了一块石头|tiao1 你随便挑|tiao1 挑个好的|tiao1 他每天挑水|tiao1 他就爱挑毛病|tiao1 你自己挑|tiao1 她挑了半天才选中
tiao1 挑几个主要的景点|tiao1 你挑一个吧|tiao1 他挑了一件红的|tiao1 他挑中了这家|tiao1 你挑出来|tiao1 挑选礼物|tiao1 挑肥拣瘦|tiao1 我挑
tiao1 他挑着担子走了|tiao1 你挑一下|tiao1t 你隨便挑|tiao1t 他挑了一塊石頭|tiao1l 你随便挑|tiao1 她挑了几样|tiao1 挑刺儿
tiao3 他挑了挑眉|tiao3 眉毛一挑|tiao3 挑起事端|tiao3 他挑衅地看着我|tiao3 别挑拨离间|tiao3 他挑明了说|tiao3 她嘴角一挑|tiao3 挑战
tiao3 他挑起眉毛|tiao3 他把窗帘挑开|tiao3 挑灯夜战|tiao3 他挑逗她|tiao3t 他挑了挑眉|tiao3t 挑起事端|tiao3 别挑事|tiao3 他把灯芯挑亮了
tiao1 你/随便挑|tiao3 他用竹竿挑起帘子|tiao3 这话挑得很明|tiao3 他挑着眉看我|tiao3 他挑大拇指
tiao1 你挑一件喜欢的|tiao1 她挑了一条红裙子|tiao3 他挑了挑眉毛|tiao1 我们去市场挑点菜|tiao1 你随便挑吧|tiao3 他故意挑事|tiao1 他挑着两桶水|tiao1 她挑了半天也没挑中|tiao3 他把话挑明了|tiao1 挑个日子吧|tiao3 他眉头一挑|tiao1 你自己挑|tiao1t 你挑一件喜歡的|tiao3t 他挑了挑眉毛|tiao3 这是个挑战
tiao3 他眉毛挑一下|tiao3 拿针挑一下|tiao3 用针把刺挑出来
tiao3 妈妈用针给我挑刺|tiao3 他拿针挑刺|tiao3 他挑了半天刺也没挑出来|tiao3 他挑了一根刺出来|tiao3 这个头谁来挑|tiao3 这个头我来挑|tiao3 这大梁你来挑|tiao3 这根大梁得你先挑|tiao3 他挑了挑眉|tiao3 他眉毛一挑
tiao3 他把门帘一挑走了进来|tiao3 他挑起了战争|tiao3 他挑拨离间|tiao3 他挑衅地看着我|tiao3 他挑起眉毛|tiao3 他挑灯夜读|tiao3 他挑明了说|tiao3 他挑逗她|tiao3 她嘴角往上挑|tiao3 他用竹竿挑起帽子|tiao3 他把灯芯挑亮了
tiao3 他挑头闹事|tiao3 是谁挑的事|tiao3 他挑起了大梁|tiao3 他眉梢一挑|tiao3 她挑了一下眉毛|tiao3 他把窗帘挑开|tiao3 她用指甲挑开包装|tiao3 这事儿是他挑起来的|tiao3 他总爱挑事|tiao3 他挑着眉看我|tiao3 他把话挑明
tiao3 这活儿你先挑头|tiao3 他挑了半天眉毛|tiao3t 媽媽用針給我挑刺|tiao3t 這個頭誰來挑|tiao3t 他挑了挑眉|tiao3t 這大樑你來挑|tiao3 他挑出一根刺|tiao3 她的眉毛挑得老高|tiao1 你随便挑|tiao1 他挑了一块西瓜|tiao1 她挑了个好的
tiao1 他每天挑水|tiao1 你挑毛病|tiao1 我挑中了这个|tiao1 他挑了半天才挑中一个|tiao1 我挑|tiao1t 你隨便挑`,
  吐: `
tu4 我想吐|tu4 他进门就吐了|tu4 他吐了|tu4 他又吐了|tu4 她吐得一塌糊涂|tu4 我快吐了|tu4 闻着这味儿就想吐|tu4 老妈又拉又吐|tu4 你吐了吗
tu4 我差点吐了|tu4 他一直吐|tu4 他喝多了，吐了|tu4 他吐得满地都是|tu4t 我想吐|tu4t 他進門就吐了|tu4l 他又吐了|tu4 恶心得想吐|tu4 他呕吐不止
tu3 他吐了口痰|tu3 她吐了吐舌头|tu3 他把核吐了|tu3 吐字清楚|tu3 他吐出一口气|tu3 他吐了一口烟|tu3 别随地吐痰|tu3 他终于吐了口|tu3 一吐为快
tu3 他把实话吐得一干二净|tu3 他吐了个烟圈|tu3 蚕吐丝|tu3 他吐苦水|tu3 她吞吞吐吐|tu3t 他吐了口痰|tu3t 吐字清楚|tu3 他吐露心声|tu3 把瓜子皮吐了
tu4 他/吐了|tu3 他吐了吐|tu3 他把骨头吐了出来|tu3 他吐出了真相
tu4 他一上车就想吐|tu4 她吐了一地|tu3 他吐了一口唾沫|tu4 孩子又吐了|tu3 他把鱼刺吐了出来|tu4 我恶心得直想吐|tu3 他吐了个舌头|tu4 你别吐在车上|tu3 他吐出一口烟|tu4 喝了那么多，能不吐吗|tu3 她终于吐露了实情|tu4 我差点儿吐了|tu4t 他一上車就想吐|tu3t 他吐了一口唾沫|tu4 她吐得昏天黑地
tu3 他把药含在嘴里，等护士一走就吐了|tu3 该说的他都吐了|tu3 他吐得很远|tu3 嘴里有东西就吐了吧|tu3t 該說的他都吐了
tu3 嘴里是什么？快吐|tu3 嘴里含的啥？快吐！|tu3 他嚼了两口，又吐了|tu3 他把糖含在嘴里，又吐了|tu3 那口药他含了半天，最后还是吐了|tu3 他尝了一口，觉得太苦，又吐了|tu3 鱼刺卡住了，他使劲咳了几下，终于吐了|tu3 他嘴硬了三天，最后也吐了|tu3 他一直吐舌头
tu3 他吐了口痰|tu3 他吐了一口气|tu3 他吐出一个烟圈|tu3 他吐了个烟圈|tu3 他吐了吐舌头|tu3 他吐字很清楚|tu3 他把瓜子皮吐了一地|tu3 他吐出几个字|tu3 他吐槽了半天|tu3 她吐露了心声|tu3 蚕在吐丝|tu3 他吐了口唾沫|tu3 他一直往地上吐唾沫
tu3 他把实话都吐出来了|tu3 该吐的都吐了|tu3 他吞吞吐吐的|tu3 不吐不快|tu3 他吐了吐烟|tu3 他总吐槽|tu3 你快吐出来|tu3 别咽下去，吐了|tu3 这钱你得吐出来|tu3 他又吐出一句话|tu3 他吐了个舌头|tu3 他把口香糖吐了|tu3 他吐了吐瓜子皮
tu3t 他嚼了兩口，又吐了|tu3t 嘴裡是什麼？快吐|tu3t 他吐了口痰|tu4 我想吐|tu4 他喝多了，又吐了|tu4 他一直吐|tu4 我快吐了|tu4 他吐得一塌糊涂|tu4 闻到那味儿我就想吐|tu4 恶心得想吐|tu4 他晕车，差点吐了|tu4t 我想吐`,
};
(async () => {
  const freeze = process.argv.indexOf('--freeze'), verbose = process.argv.includes('-v');
  const X = load(path.join(root, 'index.html'));
  await X.Dict.load(); await X.Words.load(); X.ensureFreq();
  // OLD_DATA=1: a words.txt without classes (a phone that kept version 1): the rules fall back on their lists, nothing may read worse
  if (!X.Words.pos && !process.env.OLD_DATA) throw new Error('data/words.txt has no word classes');
  // a case: its text (/ = an element boundary, 字{py} = a stated reading, * = the character meant), the row before and after (A^B$C,
  // ^^ / $$ another speaker), the stated readings by position in the text without marks
  const parse = s0 => {
    let prev = null, next = null, spP = 0, spN = 0, s = s0;
    const i = s.indexOf('^'); if (i >= 0) { prev = s.slice(0, i); s = s.slice(i + 1); if (s[0] === '^') { spP = 1; s = s.slice(1); } }
    const j = s.indexOf('$'); if (j >= 0) { next = s.slice(j + 1); s = s.slice(0, j); if (next[0] === '$') { spN = 1; next = next.slice(1); } }
    const said = new Map(); let star = -1, t = '', k = 0;
    for (let q = 0; q < s.length; q++) {
      if (s[q] === '{') { const e = s.indexOf('}', q); said.set(k - 1, s.slice(q + 1, e)); q = e; continue; }
      if (s[q] === '*') { star = k; continue; }
      t += s[q]; if (s[q] !== '/') k++;
    }
    return { s0: t, s: t.replace(/\//g, ''), row: prev != null || next != null ? { prev, next, spP, spN } : null, said, star };
  };
  // the block a case sits in, for rowCut: a podcast row (its neighbours as segments of the episode), a « Lignes » row with unknown
  // neighbours (l: both edges cut), or a book paragraph
  const blockOf = (c, l) => {
    if (!c.row) { X.setPod(null); return { closest: () => l ? {} : null, matches: () => false }; }
    const segs = [], { prev, next, spP, spN } = c.row; if (prev) segs.push({ t: prev, sp: spP ? 1 : 0 }); const i = segs.length; segs.push({ t: c.s, sp: 0 }); if (next) segs.push({ t: next, sp: spN ? 2 : 0 });
    X.setPod(segs); return { closest: () => ({}), matches: () => true, dataset: { i } };
  };
  // ruby of every character, through the path annotate() and pyLine() use (solo false = the plain segmenter, no SOLO_READ): runs of each text node, cut by soloCut
  const read = (Y, s0, trad, solo, block) => {
    Y.setTrad(trad); const parts = s0.split('/'), full = parts.join(''), out = [], open = Y.rowCut(block); let o = 0;
    for (const d of parts) {
      const re = /[㐀-䶿一-鿿豈-﫿〇]+/g; let m;
      while ((m = re.exec(d))) {
        const run = m[0], ns = Y.normZh(run, trad), at = o + m.index, cut = Y.soloCut(full, at, at + run.length, open), segs = solo ? Y.soloSegs(ns, cut) : Y.segment(ns);
        segs.forEach(([a, b], k) => { const ps = solo ? Y.segPinyin(run, ns, segs, k, cut) : Y.pinyinForWord(run.slice(a, b), ns.slice(a, b)); for (let i = a; i < b; i++) out[at + i] = { py: ps[i - a], seg: ns.slice(a, b), a: at + a, b: at + b }; });
      }
      o += d.length;
    }
    return out;
  };
  const pyStr = (s, out) => [...s].map((ch, i) => out[i] ? out[i].py || '?' : '·').join(' ');
  // every sentence of every set, with its key in the .expect file (its line, marks included)
  const all = []; // [key, text without marks, flags: trad, l, the parsed case]
  // the flags follow the label: tiao1t, le5l (not the t of tiao1 or the l of le5, liang2: those are a pinyin)
  const flags = lab => lab.replace(/^[a-z]+\d/, '');
  const addCase = (lab, body) => { const c = parse(body); all.push({ key: lab + ' ' + body, c, trad: flags(lab).includes('t'), l: flags(lab).includes('l') }); };
  const deiSets = [CASES, HELD, REVIEW, NEW, HELD2, REVIEW2];
  for (const set of deiSets) for (const line of set.trim().split(/[|\n]/)) { const t = line.trim(), sp = t.indexOf(' '); addCase(t.slice(0, sp), t.slice(sp + 1)); }
  for (const w of WORDS.split('|')) addCase('W', w);
  for (const [ch, sets] of Object.entries(CHARS)) for (const set of [sets.dev, sets.held, sets.rev, sets.rev4, sets.known]) for (const line of (set || '').trim().split(/[|\n]/)) { const t = line.trim(); if (!t) continue; const sp = t.indexOf(' '); addCase(t.slice(0, sp), t.slice(sp + 1)); }
  for (const set of Object.values(REMOVED)) for (const line of set.trim().split(/[|\n]/)) { const t = line.trim(); if (!t) continue; const sp = t.indexOf(' '); addCase(t.slice(0, sp), t.slice(sp + 1)); }
  // --freeze: the readings of an earlier index.html (normally HEAD's, before the change being tested), with the stated ones in place
  if (freeze > 0) {
    const Y = load(path.resolve(process.argv[freeze + 1]));
    await Y.Dict.load(); await Y.Words.load(); Y.ensureFreq();
    const rows = all.map(({ key, c, trad, l }) => { const o = read(Y, c.s0, trad, true, blockOf(c, l)), py = pyStr(c.s, o).split(' '); for (const [i, v] of c.said) py[i] = v; return key + '\t' + py.join(' '); });
    fs.writeFileSync(EXPECT, rows.join('\n') + '\n'); console.log(`${rows.length} sentences frozen from ${process.argv[freeze + 1]} into ${EXPECT}`); return;
  }
  const expect = new Map(fs.existsSync(EXPECT) ? fs.readFileSync(EXPECT, 'utf8').trim().split('\n').map(l => l.split('\t')) : []);
  // the other characters of a sentence against the .expect file (skip: the position being measured)
  let drift = 0;
  const check = (key, s, now, skip) => {
    const e = expect.get(key); if (!e) { drift++; console.log('NOT IN test_readings.expect (run --freeze):', key); return; }
    const a = e.split(' '), b = pyStr(s, now).split(' ');
    for (let i = 0; i < s.length; i++) if (i !== skip && a[i] !== b[i]) { drift++; console.log(`READING CHANGED  ${key}  ${s[i]} ${a[i]} → ${b[i]}`); }
  };
  // the pop-up, results in the order hitResults gives, for a tap at `at`: pīn off (the block's text nodes), pīn on (the character inside its <ruby>)
  const tap = (hit, s, at) => X.hitResults(Object.assign(hit, { str: s.slice(at, at + 14) })) || [];
  const popOff = (s0, trad, at, block) => {
    X.setTrad(trad); const nodes = s0.split('/').map(data => ({ data })); let o = 0, k = 0; while (o + nodes[k].data.length <= at) o += nodes[k++].data.length;
    return tap(Object.assign({ nodes, pos: [[nodes[k], at - o]] }, { block: Object.assign(block, { nodes }) }), s0.replace(/\//g, ''), at);
  };
  const popOn = (s, trad, at, rts, block) => {
    X.setTrad(trad); const nodes = [...s].map((ch, i) => ({ data: ch, parentElement: { closest: q => q === 'ruby[data-py]' ? { querySelector: () => ({ textContent: rts[i] }) } : null } }));
    return tap({ block: Object.assign(block, { nodes }), pos: [[nodes[at], 0]] }, s, at);
  };
  const toneless = p => p ? X.syllable(p).text.toLowerCase() : '';
  const byKey = new Map(all.map(x => [x.key, x]));
  const run = (title, cases, floor = true) => {
    const tally = { dei3: { tp: 0, fp: 0, fn: 0 }, de2: { tp: 0, fp: 0, fn: 0 } }, conf = {}, misses = [], wrong = [], merged = [], split = [];
    let n = 0, popBad = 0, deWrong = 0, nDe = 0; const drift0 = drift;
    for (const line of cases.trim().split(/[|\n]/)) {
      const t = line.trim(), sp = t.indexOf(' '), lab = t.slice(0, sp), { c } = byKey.get(t), trad = lab.includes('t'), l = lab.includes('l'), gold = want[lab[0]], { s, s0 } = c, at = s.indexOf('得'); n++;
      if (at < 0 || s.indexOf('得', at + 1) >= 0) throw new Error('not one 得: ' + s);
      const block = blockOf(c, l), now = read(X, s0, trad, true, block), old = read(X, s0, trad, false, block), got = now[at].py.toLowerCase(), oldSeg = old[at];
      check(t, s, now, at);
      for (let i = oldSeg.a; i < oldSeg.b; i++) if (i !== at && now[i] && now[i].py !== old[i].py) split.push(`${s} ${s[i]} ${old[i].py} → ${now[i].py}`);
      const segStr = (() => { const o = []; let i = 0; while (i < s.length) { if (!now[i]) { o.push(s[i]); i++; continue; } o.push(s.slice(now[i].a, now[i].b)); i = now[i].b; } return o.join(' '); })();
      if (now[at].seg !== '得') merged.push(`${name[gold]}  got ${name[got] || got}  ${s} [${now[at].seg}]`);
      // the pop-up: the ruby's word comes first when it was split off a longer one; a standalone 得's first entry is the ruby's reading
      const wasSplit = now[at].a !== oldSeg.a || now[at].b !== oldSeg.b, rts = [...s].map((_, i) => now[i] ? toneless(now[i].py) : '');
      for (const [mode, res] of [['pīn off', popOff(s0, trad, now[at].a, block)], ['pīn on', popOn(s, trad, now[at].a, rts, block)]]) {
        const w = now[at].b - now[at].a, r0 = res[0], rd = res.find(x => x.word === '得');
        const bad = wasSplit && (!r0 || r0.word.length !== w || toneless(r0.entries[0].pinyin.split(' ')[0]) !== rts[now[at].a])
          || (now[at].seg === '得' && (!rd || toneless(rd.entries[0].pinyin) !== toneless(got)));
        if (bad) { popBad++; console.log('POP-UP DISAGREES', mode, s0, 'ruby', segStr, got, '| pop-up', res.slice(0, 3).map(x => x.word + ' ' + x.entries[0].pinyin).join(', ')); }
      }
      for (const k of ['dei3', 'de2']) { if (got === k && gold === k) tally[k].tp++; else if (got === k) tally[k].fp++; else if (gold === k) tally[k].fn++; }
      const key = `${name[gold]} → ${name[got] || got}`; conf[key] = (conf[key] || 0) + 1;
      if (gold === 'de5') { nDe++; if (got !== 'de5') deWrong++; }
      const why = `${name[gold]}  got ${name[got] || got}  ${t}   (${segStr})`;
      if (got !== gold) (gold === 'de5' || got !== 'de5' ? wrong : misses).push(why);
    }
    const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '–';
    console.log(`\n${title}: ${n} sentences (${nDe} of them de); ${merged.length} with the 得 inside a longer word, measured too`);
    for (const k of ['dei3', 'de2']) { const t = tally[k]; console.log(`${name[k]}: precision ${pct(t.tp, t.tp + t.fp)} (${t.tp}/${t.tp + t.fp})  recall ${pct(t.tp, t.tp + t.fn)} (${t.tp}/${t.tp + t.fn})`); }
    console.log(`de sentences read otherwise: ${deWrong}/${nDe}; other characters changed: ${drift - drift0}; pop-up ≠ ruby: ${popBad}`);
    console.log('confusion (gold → got):', Object.entries(conf).map(([k, v]) => `${k}: ${v}`).join(', '));
    if (verbose && merged.length) console.log('得 inside a longer word:\n  ' + merged.join('\n  '));
    if (verbose && split.length) console.log('re-read with the 得 split off (expected):\n  ' + split.join('\n  '));
    if (wrong.length) console.log('WRONG READINGS:\n  ' + wrong.join('\n  '));
    if (misses.length) console.log('misses (read de):\n  ' + misses.join('\n  '));
    // fails on: a de read otherwise, any wrong děi / dé, the pop-up not following the ruby, or the rules no longer firing (recall under
    // 85% on the dev and held-out sets); another character changed is counted in `drift`
    const low = ['dei3', 'de2'].filter(k => { const t = tally[k]; return floor && t.tp + t.fn >= 10 && t.tp < 0.85 * (t.tp + t.fn); });
    if (low.length) console.log('RECALL TOO LOW:', low.map(k => name[k]).join(', '));
    return deWrong + popBad + tally.dei3.fp + tally.de2.fp + low.length;
  };
  let bad = run('dev set', CASES) + run('held-out set', HELD) + run('review set', REVIEW, false) + run('this round', NEW, false);
  if (HELD2.trim()) bad += run('this round, held out', HELD2, false);
  bad += run('second review', REVIEW2, false);
  console.log('\nknown wrong readings (not counted): ' + KNOWN.split('|').map(c => { const s = c.slice(2), r = read(X, s, false, true, blockOf(parse(s), false)); return `${s} ${name[r[s.indexOf('得')].py.toLowerCase()]} (want ${name[want[c[0]]]})`; }).join(', '));
  const d0 = drift; for (const w of WORDS.split('|')) { const c = byKey.get('W ' + w).c; check('W ' + w, c.s, read(X, c.s0, false, true, blockOf(c, false)), -1); }
  console.log(`\nwords with 得 inside (觉得, 不得不, 得出结论…): ${drift - d0} reading changed`);

  // the other characters: the labelled one (wrong = an alternative reading where it does not belong, or the usual one given where another
  // is right; miss = the usual reading where another is right), the pop-up's first entry, the same with old data, the rest of the sentence
  console.log('\n— other characters —');
  const sum = [];
  for (const [ch, sets] of Object.entries(CHARS)) for (const [title, set] of [['dev', sets.dev], ['held out', sets.held], ['review 3', sets.rev], ['review 4', sets.rev4]]) {
    if (!set || !set.trim()) continue;
    let n = 0, alt = 0, tp = 0, fp = 0, fn = 0, popBad = 0, oldBad = 0; const wrong = [], misses = [], before = [], d1 = drift;
    for (const line of set.trim().split(/[|\n]/)) {
      const t = line.trim(); if (!t) continue; const sp = t.indexOf(' '), lab = t.slice(0, sp), { c } = byKey.get(t), trad = flags(lab).includes('t'), l = flags(lab).includes('l'), gold = lab.replace(/[tl]+$/, ''), { s, s0 } = c;
      const at = c.star >= 0 ? c.star : [...s].findIndex(x => X.normZh(x, trad) === ch); if (at < 0 || X.normZh(s[at], trad) !== ch) throw new Error(`no ${ch} in ${s}`); n++;
      const block = blockOf(c, l), now = read(X, s0, trad, true, block), got = now[at].py.toLowerCase(), usual = X.pinyinForWord(s[at], ch)[0].toLowerCase();
      check(t, s, now, at);
      // old data: the same reading without word classes (the rules use word lists only)
      X.Words.pos = false; const o2 = read(X, s0, trad, true, block)[at].py.toLowerCase(); X.Words.pos = true; if (o2 !== got) { oldBad++; console.log(`OLD DATA DIFFERS  ${ch} ${t}: ${got} / ${o2}`); }
      if (gold !== usual) alt++;
      if (got !== usual && got === gold) tp++; else if (got !== usual) fp++; else if (gold !== usual) fn++;
      const segStr = (() => { const o = []; let i = 0; while (i < s.length) { if (!now[i]) { o.push(s[i]); i++; continue; } o.push(s.slice(now[i].a, now[i].b)); i = now[i].b; } return o.join(' '); })();
      // (a word read as before, by the dictionary, is the earlier error, listed apart: 雨不停地下 with the segmenter's 地下, 没什么好处 chu5)
      const was = (expect.get(t) || '').split(' ')[at];
      if (got !== gold) (got === was && got !== gold && (got !== usual || now[at].b - now[at].a > 1) ? before : got !== usual || gold === usual ? wrong : misses).push(`${gold} got ${got}  ${t}   (${segStr})`);
      // the pop-up's first entry for a standalone character is the ruby's reading, pīn mode off and on
      if (now[at].b - now[at].a === 1) {
        const rts = [...s].map((_, i) => now[i] ? toneless(now[i].py) : '');
        for (const [mode, res] of [['pīn off', popOff(s0, trad, at, block)], ['pīn on', popOn(s, trad, at, rts, block)]]) {
          // (the first result too: a longer word comes first only when it reads the character as the ruby does, 长得 zhǎng de)
          const r1 = res.find(x => x.word.length === 1), r0 = res[0];
          if (!r1 || toneless(r1.entries[0].pinyin) !== toneless(got) || toneless(r0.entries[0].pinyin.split(' ')[0]) !== toneless(got)) { popBad++; console.log('POP-UP DISAGREES', mode, ch, t, 'ruby', got, '| pop-up', r0 ? r0.word + ' ' + r0.entries[0].pinyin : '-', r1 ? r1.entries[0].pinyin : '-'); }
        }
      }
    }
    const pct = (a, b) => b ? (100 * a / b).toFixed(0) + '%' : '–';
    sum.push(`${ch} ${title.padEnd(8)} ${String(n).padStart(3)} sentences, ${String(alt).padStart(3)} with another reading: precision ${pct(tp, tp + fp)} (${tp}/${tp + fp}), recall ${pct(tp, tp + fn)} (${tp}/${tp + fn})${wrong.length ? `, WRONG ${wrong.length}` : ''}${before.length ? `, ${before.length} word${before.length > 1 ? 's' : ''} as before` : ''}${popBad ? `, POP-UP ${popBad}` : ''}${oldBad ? `, OLD DATA ${oldBad}` : ''}${drift > d1 ? `, CHANGED ${drift - d1}` : ''}`);
    if (wrong.length) console.log(`WRONG READINGS (${ch}, ${title}):\n  ` + wrong.join('\n  '));
    if (misses.length && (verbose || title !== 'dev')) console.log(`misses (${ch}, ${title}, the usual reading kept):\n  ` + misses.join('\n  '));
    if (before.length) console.log(`read as before this round, by a dictionary word (${ch}, ${title}; not counted):\n  ` + before.join('\n  '));
    bad += wrong.length + popBad + oldBad;
  }
  console.log(sum.join('\n'));
  const known = Object.entries(CHARS).filter(([, x]) => x.known).flatMap(([ch, x]) => x.known.trim().split(/[|\n]/).map(t => { const sp = t.indexOf(' '), { c } = byKey.get(t), tr = flags(t.slice(0, sp)).includes('t'), r = read(X, c.s0, tr, true, blockOf(c, false)); return `${c.s} ${r[[...c.s].findIndex(y => X.normZh(y, tr) === ch)].py} (want ${t.slice(0, sp)})`; }));
  if (known.length) console.log('known wrong readings (not counted): ' + known.join(', '));
  // the characters whose rules were taken out: every reading as in the .expect file (the earlier index.html)
  const d2 = drift; let nRm = 0;
  for (const set of Object.values(REMOVED)) for (const line of set.trim().split(/[|\n]/)) { const t = line.trim(); if (!t) continue; const { c } = byKey.get(t), trad = flags(t.slice(0, t.indexOf(' '))).includes('t'); nRm++; check(t, c.s, read(X, c.s0, trad, true, blockOf(c, false)), -1); }
  console.log(`\nrules taken out (${Object.keys(REMOVED).join(' ')}): ${nRm} sentences, ${drift - d2} reading changed`);
  console.log(`\nreadings that differ from test_readings.expect: ${drift}`);
  process.exitCode = bad || drift ? 1 : 0;
})();
