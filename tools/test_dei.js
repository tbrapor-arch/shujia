// Standalone 得 in pīn mode: děi "must" / dé "to get" / de (complement), as SOLO_READ in index.html decides.
// Runs the app's own functions (taken from index.html by name) on the real data files, on hand-written labelled sentences;
// prints precision / recall for děi and dé, every miss, and checks that no other character's reading changed.
// Usage: node tools/test_dei.js [-v]     (from the repo root or anywhere; needs only Node)
// Labels: I = děi, E = dé, D = de; a t after the label = traditional characters, an l = a « Lignes » row (its edges are cuts);
// a / in a sentence = an element boundary (他气/得把杯子摔了 is 他气<b>得</b>…: annotate() sees each text node alone); one 得 per sentence.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');

// top-level declarations of the main script, by name (a statement runs until the next line that starts at column 0)
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = html.slice(html.indexOf('<script>\n"use strict";'), html.lastIndexOf('</script>'));
const stmts = new Map(); let cur = null;
for (const L of src.split('\n')) {
  const m = /^(?:async )?(?:const|let|function) ([\w$]+)/.exec(L);
  if (m) stmts.set(cur = m[1], [L]); else if (/^\S/.test(L) && !/^[)}\].(]/.test(L)) cur = null; else if (cur) stmts.get(cur).push(L);
}
const NAMES = ('HAN DICT_VERSION Dict Words normZh wfreq segment goodPart cedictParts MINOR_RE pyPref READ_MAIN WORD_PY readPref isMinor REF_RE isRefDef isRefOnly ' +
  'pyKey refTarget charEntry CTX_READ partEntry PY_DEFAULT pickPinyin pinyinForWord parseEntry MARKS syllable FREQ ensureFreq RANK_STR HSK_STR rankOf ' +
  'bestOf VARIANTS isIdiom DEI_SUBJ DEI_THIS SURNAMES DE_OBJ deiBefore DEI_VERBISH DEI_COMP SOLO_CUT soloCut SOLO_READ soloRead segPinyin OLD_SENSE_RE hitResults hitSoloRead').split(' ');
// stubs: data files from disk; the pop-up's text walker over a fake block of text nodes; compoundEntry only serves multi-character taps
const stubs = `const breathe = () => Promise.resolve(); async function dataText(k, v, url) { return fs.readFileSync(path.join(root, url), 'utf8'); }
let TRAD = false; const bookIsTrad = () => TRAD; const compoundEntry = () => null;
const textWalker = block => { let i = 0; return { nextNode: () => block.nodes[i++] || null }; };`;
const ctx = vm.createContext({ console, fs, path, root, window: {} });
vm.runInContext(stubs + '\n' + NAMES.map(n => { if (!stmts.has(n)) throw new Error('not in index.html: ' + n); return stmts.get(n).join('\n'); }).join('\n') +
  `\n;globalThis.X = { ${NAMES.join(', ')}, setTrad: t => { TRAD = t; } };`, ctx);
const X = ctx.X;

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
D 把我急得|D 冻得我直哆嗦|D 他饿得前胸贴后背|D 累得我腰都直不起来|D 疼得他直咧嘴|D 他高兴得跳了起来|D 你长得真俊|D 她唱得比谁都好|D 他喝得烂醉
D 打得他满地找牙|D 骂得他狗血淋头|D 他跑得了吗|D 我吃得了|D 这活干得漂亮|D 说得我都不好意思了|D 逼得他没办法|D 热得要命|D 好得很|D 困得不行
D 他忙得脚打后脑勺|D 你整得挺好|D 他喝得五迷三道的|D 冷得够呛|D 吓得他把手机都扔了|D 气得他把门一摔|D 弄得我们很被动|D 搞得大家都不高兴
D 闹得满城风雨|D 说得好听|D 做得不错|D 他哭得稀里哗啦|D 睡得香|D 吃得饱饱的|D 活得像个人样|D 他过得挺好|D 他混得不错|D 他想得太多了
D 她长得跟她妈一样|D 笑得合不拢嘴|D 激动得哭了|D 感动得说不出话|D 我怕得要死|D 他变得越来越沉默|D 弄得一团糟|D 跑得满头大汗|D 这事办得漂亮
D 那天他喝得太多了|D 拿得动吗|D 吃得下|D 他们聊得很开心|D 雪下得很大|D 风刮得厉害|D 屋里收拾得干干净净|D 他打扮得花枝招展|D 你想得美
D 跑得比兔子还快|D 他说得跟真的似的|D 急得他团团转|D 吓得我一身冷汗|D 羞得她满脸通红|D 老王跑得快|D 孩子哭得厉害|D 她妈气得直哆嗦
D 把孩子哄得高高兴兴的|D 老师讲得好|D 他领导得好|D 把屋子弄得乱七八糟|D 撑得我直打嗝|D 憋得他脸都红了|D 这菜做得太咸了|D 他整得我没脾气
D 走得了走不了|D 他来得晚|D 冻得够呛|D 他干得热火朝天|D 想得开|D 输得很惨|D 说得我心里发毛|D 你瞅瞅你嘚瑟得|D 他忙得连饭都顾不上吃
Dt 氣得把杯子摔了|Dt 嚇得她直哭|Dt 他寫得真好|Dt 冷得夠嗆|Dt 他說得對|Dt 累得我腰都直不起來|Dt 嚇得他把手機都扔了|Dt 你長得真俊
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
D 钱还得差不多了|D 他估计得没错|D 你还得挺快|D 他跑得飞快|D 她哭得眼睛都肿了|D 吓得我赶紧跑|D 气得她一宿没睡|D 说得他脸都红了|D 你笑得真难看
D 他醉得一塌糊涂|D 写得太潦草了|D 他俩吵得不可开交|D 孩子们玩得很开心|D 活儿干得不赖|D 这雨下得真大|D 看得我眼都花了|D 饿得我前胸贴后背
D 把他吓得够呛|D 把我气得直哆嗦|D 整得跟真事儿似的|D 她打扮得挺好看|D 你来得正好|D 天冷得要命|D 他累得倒头就睡|D 走得太急了|D 这钱花得值
D 他俩处得挺好|D 她瘦得皮包骨|D 这房子收拾得挺干净|Dt 嚇得我趕緊跑|Dt 她哭得眼睛都腫了|Dt 這雨下得真大|Dt 他累得倒頭就睡
D 钱都还得差不多了|D 你估计得太乐观了|D 他回头回得很快|E 歇一会儿得了|D 他跑得比谁都快|D 你闹得也太过分了|D 他饿得直叫唤|D 我困得睁不开眼
D 他愁得一宿没合眼|D 她急得直跺脚|D 你吹得天花乱坠|D 他吓得一哆嗦|D 那孩子哭得可怜|D 冻得他直跺脚|D 气得我直想骂人|D 逗得大家哈哈大笑|D 撵得他满街跑
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
D 他回头看得清清楚楚|D 球他接得稳稳当当|D 他接着说得更起劲了|D 这事儿办得不地道|D 这事弄得我很尴尬|D 这事整得挺闹心|D 那事搞得大家都不痛快|D 这人长得挺精神|D 那人长得五大三粗的|D 这人说得倒轻巧
D 那人跑得比兔子还快|D 这钱花得冤枉|D 这钱挣得不容易|D 那钱来得太容易了|D 你看他那病得，脸都黄了|D 瞧他那病得，连床都下不来了|D 瞧他这病得，瘦成什么样了
D 打得他鼻青脸肿|D 把他吓得脸都白了|D 把我气得浑身发抖|D 他把我气得半死|D 看你美得，鼻涕泡都出来了|D 瞧你乐得那样|D 看把你急得|D 把她感动得稀里哗啦的|D 他把我们骗得好苦|D 你把他说得一无是处
D 把咱们折腾得够呛|D 他把自己喝得烂醉|D 把人家吓得够呛|D 把大家逗得前仰后合|D 你帽子老戴得歪歪扭扭的|D 他老顾得了这头顾不了那头
D 孩子哭得嗓子都哑了|D 老王说得对|D 小李跑得快|D 妈气得把碗都摔了|D 我妈气得一宿没睡|D 爸爸喝得满脸通红|D 老张笑得合不拢嘴|D 小刘吓得直往后退|D 老师讲得很清楚|D 医生说得很明白
D 警察来得很快|D 奶奶乐得直拍大腿|D 姥姥高兴得直抹眼泪|D 媳妇气得回娘家了|D 闺女长得随她妈|D 老公做饭做得比我好|D 儿子学得挺快|D 姐姐唱得好听|D 弟弟吃得满嘴是油|D 人家说得在理
D 大家玩得很尽兴|D 别人过得比你好|D 小王跑得满头大汗|D 老李喝得舌头都大了
D 你整得跟真的似的|D 这屋造得没法看了|D 你造得埋了吧汰的|D 他说得那叫一个溜|D 你弄得我一身汗|D 他忽悠得我直迷糊|D 你唠得挺来劲啊|D 他磨叽得我都烦了|D 整得我老闹心了|D 造得埋汰巴拉的
D 冻得嘎嘎的|D 热得冒油|D 他嘚瑟得不行|D 他整得挺像回事儿|D 咋整得这么埋汰|D 你咋喝得这么多
D 他一把推开门，吓得屋里人都愣住了|D “你看看，”他气得直跺脚|D “好！”老头乐得胡子直翘|D 他——跑得飞快|D 他说，说得眼泪都下来了|D 天太冷了，冻得人直哆嗦|D 跑——得——飞快|D 他气得……把杯子摔了
D 那年冬天雪下得特别大|D 他把车开得飞快|D 她把头发剪得很短|D 屋里静得能听见针掉在地上|D 他睡得像头死猪|D 她笑得很勉强|D 这顿饭吃得很憋屈|D 他把话说得很难听|D 那首歌她唱得特别动人|D 灯光暗得看不清人脸
D 他走得很急，连伞都忘了|D 她哭得说不出话来|D 风吹得窗户哐哐响|D 太阳晒得人睁不开眼|D 他瘦得只剩一把骨头|D 她把日子过得紧巴巴的|D 我们聊得忘了时间|D 他忙得四脚朝天|D 外面吵得我睡不着|D 他病得连饭都吃不下
D 这孩子病得不轻|D 那孩子长得真快|D 这孩子懂事得让人心疼|D 雨下得没完没了|D 这几天过得浑浑噩噩|D 她紧张得手心冒汗|D 他激动得一夜没睡|D 你说得轻巧
D 这本书写得真是太好了|D 这个故事讲得挺有意思的|D 他那会儿混得特别惨|D 那段时间我过得特别难|D 这个事情说得再直白一点|D 你这个问题问得好|D 他做得最好的一件事|D 当时我们吵得特别凶|D 后来他发展得很好|D 他回答得很巧妙
D 现在发展得太快了|D 然后他就哭得稀里哗啦|D 接着他又说得天花乱坠|D 再说得明白点|D 就说得好听|D 都说得差不多了|D 先说得好好的，后来又变卦了|D 才过得像样点|D 可把我累得够呛|D 这下把他乐得
D 那叫一个说得好|D 回头想想，他说得也有道理|D 估计说得没错
D 你想得倒美|D 你藏得够深的|D 你演得真像|D 你装得挺像啊|D 你来得正是时候|D 我看你是活得不耐烦了|D 他死得好冤|D 你这话说得|D 你骂得对|D 她打扮得跟个妖精似的
D 你们玩得开心吗|D 咱俩聊得来|D 他俩吵得不可开交|D 他们闹得很僵|D 我俩处得像亲兄弟
Dt 他把我氣得半死|Dt 這事辦得漂亮|Dt 那人長得五大三粗的|Dt 欠的錢他早就還得一乾二淨了|Dt 老王說得對|Dt 孩子哭得嗓子都啞了|Dt 你整得跟真的似的|Dt 這錢掙得不容易|Dt 嚇得屋裡人都愣住了|Dt 他估計得八九不離十
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
// still read děi although they are the complement de (还 huán / 估计 + an adjective: no telling without part-of-speech tags); printed, not counted
const KNOWN = 'D 他还得上这笔钱吗|D 这钱他还得爽快|D 专家估计得保守了|D 这个数你估计得偏高了|D 他估计得过于乐观';
// words with 得 inside them keep their dictionary reading: only a regression check (觉得, 不得不, 非得…)
const WORDS = '我觉得他是对的|你记得吗|他不得不走|你非得这样吗|我总得吃饭吧|他得到了一切|你懂得真多|这事值得一试|他显得特别年轻|你来得及吗|得了吧|他得罪了人|这可不得了|舍不得走|我还不得累死';

const want = { I: 'dei3', E: 'de2', D: 'de5' };
const name = { dei3: 'děi', de2: 'dé', de5: 'de' };
(async () => {
  await X.Dict.load(); await X.Words.load(); X.ensureFreq();
  const verbose = process.argv.includes('-v');
  // ruby of every character of a text, through the path annotate() and pyLine() use (old = without SOLO_READ): runs of each text node, cut by soloCut
  const read = (s, trad, solo, open = false) => {
    X.setTrad(trad); const parts = s.split('/'), full = parts.join(''), out = []; let o = 0;
    for (const d of parts) {
      const re = /[㐀-䶿一-鿿豈-﫿〇]+/g; let m;
      while ((m = re.exec(d))) {
        const run = m[0], ns = X.normZh(run, trad), segs = X.segment(ns), at = o + m.index, cut = X.soloCut(full, at, at + run.length, open);
        segs.forEach(([a, b], k) => { const ps = solo ? X.segPinyin(run, ns, segs, k, cut) : X.pinyinForWord(run.slice(a, b), ns.slice(a, b)); for (let i = a; i < b; i++) out[at + i] = { py: ps[i - a], seg: ns.slice(a, b) }; });
      }
      o += d.length;
    }
    return out;
  };
  // the pop-up, entries in the order hitResults gives: pīn off, a tap on 得 in the block's text nodes; pīn on, a tap on 得 inside its <ruby>
  const first = (hit, s, at) => { const r = (X.hitResults(Object.assign(hit, { str: s.slice(at, at + 14) })) || []).find(x => x.word === '得'); return r ? r.entries[0].pinyin : null; };
  const pop = (s, trad, at, open) => {
    X.setTrad(trad); const nodes = s.split('/').map(data => ({ data })); let o = 0, k = 0; while (o + nodes[k].data.length <= at) o += nodes[k++].data.length;
    return first({ block: { nodes, closest: () => open ? {} : null }, pos: [[nodes[k], at - o]] }, s.replace(/\//g, ''), at);
  };
  const popOn = (s, trad, at, rt) => {
    X.setTrad(trad); s = s.replace(/\//g, ''); const ruby = { querySelector: () => ({ textContent: rt }) };
    const nodes = [{ data: s.slice(0, at) }, { data: s[at], parentElement: { closest: q => q === 'ruby[data-py]' ? ruby : null } }, { data: s.slice(at + 1) }];
    return first({ block: { nodes, closest: () => null }, pos: [[nodes[1], 0]] }, s, at);
  };
  const run = (title, cases, floor = true) => {
  const tally = { dei3: { tp: 0, fp: 0, fn: 0 }, de2: { tp: 0, fp: 0, fn: 0 } }, conf = {}, misses = [], merged = []; let n = 0, solo = 0, regress = 0, popBad = 0, deWrong = 0, nDe = 0;
  for (const c of cases.trim().split(/[|\n]/)) {
    const [lab, s0] = c.trim().split(' '), trad = lab.includes('t'), open = lab.includes('l'), gold = want[lab[0]], s = s0.replace(/\//g, ''), at = s.indexOf('得'); n++;
    if (s.indexOf('得', at + 1) >= 0) throw new Error('two 得: ' + s);
    const now = read(s0, trad, true, open), old = read(s0, trad, false, open), got = now[at].py.toLowerCase();
    for (let i = 0; i < s.length; i++) if (i !== at && now[i] && (now[i].py !== old[i].py)) { regress++; console.log('REGRESSION', s, i, old[i].py, '→', now[i].py); }
    // 得 the segmenter keeps inside a word (得来, 得出, 吃得了) has that word's reading, the same as before: not counted
    if (now[at].seg !== '得') { merged.push(`${name[gold]}  got ${name[got] || got}  ${s} [${now[at].seg}]`); continue; }
    const off = pop(s0, trad, at, open), on = popOn(s0, trad, at, name[got]);
    if (off !== got || on !== got) { popBad++; console.log('POP-UP DISAGREES', s0, got, 'pīn off', off, 'pīn on', on); }
    solo++;
    for (const k of ['dei3', 'de2']) { if (got === k && gold === k) tally[k].tp++; else if (got === k) tally[k].fp++; else if (gold === k) tally[k].fn++; }
    const key = `${name[gold]} → ${name[got] || got}`; conf[key] = (conf[key] || 0) + 1;
    if (gold === 'de5') { nDe++; if (got !== 'de5') deWrong++; }
    if (got !== gold) misses.push(`${name[gold]}  got ${name[got] || got}  ${s0}   (${X.segment(X.normZh(s, trad)).map(([a, b]) => s.slice(a, b)).join(' ')})`);
  }
  const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '–';
  console.log(`\n${title}: ${n} sentences; ${solo} with a standalone 得 (${nDe} of them de), measured below`);
  for (const k of ['dei3', 'de2']) { const t = tally[k]; console.log(`${name[k]}: precision ${pct(t.tp, t.tp + t.fp)} (${t.tp}/${t.tp + t.fp})  recall ${pct(t.tp, t.tp + t.fn)} (${t.tp}/${t.tp + t.fn})`); }
  console.log(`de sentences read otherwise: ${deWrong}/${nDe}; other characters changed: ${regress}; pop-up first entry ≠ ruby: ${popBad}`);
  console.log('confusion (gold → got):', Object.entries(conf).map(([k, v]) => `${k}: ${v}`).join(', '));
  if (merged.length) console.log('得 inside a longer word (its dictionary reading, unchanged, not measured):\n  ' + merged.join('\n  '));
  if (verbose || misses.length) console.log('misses:\n  ' + misses.join('\n  '));
  // fails on: another character changed, a de read otherwise, any wrong děi / dé, the pop-up not following the ruby, or the rules
  // no longer firing (recall under 85% on the dev and held-out sets)
  const low = ['dei3', 'de2'].filter(k => { const t = tally[k]; return floor && t.tp + t.fn >= 10 && t.tp < 0.85 * (t.tp + t.fn); });
  if (low.length) console.log('RECALL TOO LOW:', low.map(k => name[k]).join(', '));
  return regress + deWrong + popBad + tally.dei3.fp + tally.de2.fp + low.length;
  };
  let bad = run('dev set', CASES) + run('held-out set', HELD) + run('review set', REVIEW, false), regress = 0;
  console.log('\nknown wrong readings (not counted): ' + KNOWN.split('|').map(c => { const s = c.slice(2); return s + ' ' + name[read(s, false, true)[s.indexOf('得')].py.toLowerCase()]; }).join(', '));
  for (const s of WORDS.split('|')) { const now = read(s, false, true), old = read(s, false, false); for (let i = 0; i < s.length; i++) if (now[i] && now[i].py !== old[i].py) { regress++; console.log('REGRESSION', s, i, old[i].py, '→', now[i].py); } }
  console.log(`\nwords with 得 inside (觉得, 不得不…): ${regress} reading changed`);
  process.exitCode = bad || regress ? 1 : 0;
})();
