// Tuples, interfaces, hashes and process control in plain TypeScript.
import type { Str, Panic, UMul, Hex, Hex128, FromHex, uitoa, ieq, iadd, isub, imul, ixor, iushr, ishl, iand, ior, ineg, inot, ilt, igt, udiv } from "./int";
import type { slen, sat, sslice } from "./str";
import type { CharByte, CharHex } from "./tables";
import type { hget, hset } from "./heap";
import type { rterr } from "./rterr";

// (pairs and triples, the usual interfaces, slices and results, by matching:
// an indexed access makes a checker resolve the members of every new tuple)
/** @native tget */
export type tget<T, I> = tget_c<T, I extends bigint ? I : never>;
type tget_c<T, I extends bigint> =
  T extends [infer A, infer B] ? I extends 0n ? A : I extends 1n ? B : never
  : T extends [infer A, infer B, infer C] ? I extends 0n ? A : I extends 1n ? B : I extends 2n ? C : never
  : T extends unknown[] ? T[Str<I> & keyof T] : Panic<"tget: not a tuple">;
/** @native tset */
export type tset<T, I, V> = tset_c<T extends unknown[] ? T : never, I extends bigint ? I : never, V>;
type tset_c<T extends unknown[], I extends bigint, V> = { [K in keyof T]: K extends Str<I> ? V : T[K] };

// structural equality (==) of values
/** @native geq */
export type geq<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false;
/** @native gne */
export type gne<A, B> = geq<A, B> extends true ? false : true;
/** @native bnot */
export type bnot<B> = B extends true ? false : true;

/** @native nilchk */
export type nilchk<P> = [P] extends [null] ? rterr<"invalid memory address or nil pointer dereference"> : P;

// type assertions on interface values [typeId, value]
/** @native ta1 */
export type ta1<X, Id> =
  [X] extends [null] ? rterr<"interface conversion: interface is nil">
  : X extends [infer T, infer V] ? [T] extends [Id] ? V : rterr<"interface conversion: wrong type"> : never;
/** @native ta2 */
export type ta2<X, Id, Z> =
  [X] extends [null] ? [Z, false] : X extends [infer T, infer V] ? [T] extends [Id] ? [V, true] : [Z, false] : never;

/** @native panic */
export type panic<Msg> = Panic<Msg>;

// Go panics are values that calls pass on (see go2types' bstate.call); cell 3
// holds the panic being handled while deferred calls run, for recover
export type gpanic<H, V> = { tstst_panic: V; heap: H };
export type gunwind<H, V> = hset<H, 3n, [V]>;
export type grecover<H> = hget<H, 3n> extends [infer V] ? [hset<H, 3n, null>, V] : [H, null];
export type gtrace<X, R = X> = R;

// a 64-bit string hash standing in for xxh3.HashString (tsc never shows one)
type Hash64<S extends string, A extends bigint> =
  S extends `${infer C}${infer R}` ? Hash64<R, imul<ixor<A, CharByte[C & keyof CharByte]>, 1099511628211n>> : A;
/** @native shash64 */
export type shash64<S> = shash64_c<S extends string ? S : never>;
type shash64_c<S extends string> =
  Hash64<S, -3750763034362895579n> extends infer A extends bigint ? imul<ixor<A, iushr<A, 33n>>, -49064778989728563n> : never;

// XXH3-128 (seed 0, the default secret) of a Go string, as
// github.com/zeebo/xxh3's HashString128 computes it: [hi, lo]. The hashes show
// up in output (the file versions of .tsbuildinfo).
// the full product of two uint64: [hi, lo]
// (the 128 bits as 32 hex digits, not a long division by 2^64)
type Mul128<A extends bigint, B extends bigint> =
  Hex128<UMul<uitoa<A>, uitoa<B>>> extends `${infer c0}${infer c1}${infer c2}${infer c3}${infer c4}${infer c5}${infer c6}${infer c7}${infer c8}${infer c9}${infer c10}${infer c11}${infer c12}${infer c13}${infer c14}${infer c15}${infer lo}` ? [FromHex<`${c0}${c1}${c2}${c3}${c4}${c5}${c6}${c7}${c8}${c9}${c10}${c11}${c12}${c13}${c14}${c15}`>, FromHex<lo>] : never;
type MulFold<A extends bigint, B extends bigint> =
  Mul128<A, B> extends [infer H extends bigint, infer L extends bigint] ? ixor<H, L> : never;
type Mul32<X extends bigint> = imul<iand<X, 4294967295n>, iushr<X, 32n>>;
// the little-endian words at the start of S
// (words are put together as hex digits, a byte's two by table)
type CH<C extends string> = CharHex[C & keyof CharHex];
type LE64<a extends string, b extends string, c extends string, d extends string, e extends string, f extends string, g extends string, h extends string> =
  FromHex<`${CH<h>}${CH<g>}${CH<f>}${CH<e>}${CH<d>}${CH<c>}${CH<b>}${CH<a>}`>;
type W64<S extends string> =
  S extends `${infer a}${infer b}${infer c}${infer d}${infer e}${infer f}${infer g}${infer h}${string}` ? LE64<a, b, c, d, e, f, g, h> : never;
type W32<S extends string> =
  S extends `${infer a}${infer b}${infer c}${infer d}${string}` ? FromHex<`00000000${CH<d>}${CH<c>}${CH<b>}${CH<a>}`> : never;
type R64<S extends string, O extends bigint> = W64<sslice<S, O, iadd<O, 8n>> & string>;
type K<O extends bigint> = K64[Str<O> & keyof K64];
// the bytes of X's hex digits in reverse order
type Bswap64<X extends bigint> =
  Hex<X> extends `${infer a0}${infer a1}${infer b0}${infer b1}${infer c0}${infer c1}${infer d0}${infer d1}${infer e0}${infer e1}${infer f0}${infer f1}${infer g0}${infer g1}${infer h0}${infer h1}`
    ? FromHex<`${h0}${h1}${g0}${g1}${f0}${f1}${e0}${e1}${d0}${d1}${c0}${c1}${b0}${b1}${a0}${a1}`> : never;
// the low 32 bits of X with their bytes reversed
type Bswap32<X extends bigint> =
  Hex<X> extends `${string}${string}${string}${string}${string}${string}${string}${string}${infer e0}${infer e1}${infer f0}${infer f1}${infer g0}${infer g1}${infer h0}${infer h1}`
    ? FromHex<`00000000${h0}${h1}${g0}${g1}${f0}${f1}${e0}${e1}`> : never;
type XAval<X extends bigint> =
  imul<ixor<X, iushr<X, 37n>>, 1609587791953885689n> extends infer a extends bigint ? ixor<a, iushr<a, 32n>> : never;
type XAvalSmall<X extends bigint> =
  imul<X, -4417276706812531889n> extends infer a extends bigint
    ? imul<ixor<a, iushr<a, 29n>>, 1609587929392839161n> extends infer b extends bigint ? ixor<b, iushr<b, 32n>> : never
    : never;

type Len1to3<S extends string, L extends bigint> =
  ior<ior<ishl<sat<S, 0n>, 16n>, ishl<sat<S, iushr<L, 1n>>, 24n>>, ior<sat<S, isub<L, 1n>>, ishl<L, 8n>>> extends infer lo extends bigint
    ? Bswap32<lo> extends infer w extends bigint
      ? [XAvalSmall<ixor<ior<iand<ishl<w, 13n>, 4294967295n>, iushr<w, 19n>>, 808198283n>>, XAvalSmall<ixor<lo, 2267503259n>>]
      : never
    : never;
type Len4to8<S extends string, L extends bigint> =
  ixor<iadd<W32<S>, ishl<W32<sslice<S, isub<L, 4n>, L> & string>, 32n>>, -4255862940314790740n> extends infer keyed extends bigint
    ? Mul128<keyed, iadd<-7046029288634856825n, ishl<L, 2n>>> extends [infer h0 extends bigint, infer l0 extends bigint]
      ? iadd<h0, ishl<l0, 1n>> extends infer hi extends bigint
        ? ixor<l0, iushr<hi, 3n>> extends infer l1 extends bigint
          ? imul<ixor<l1, iushr<l1, 35n>>, -6939452855193903323n> extends infer l2 extends bigint
            ? [XAval<hi>, ixor<l2, iushr<l2, 28n>>]
            : never
          : never
        : never
      : never
    : never;
type Len9to16<S extends string, L extends bigint> =
  R64<S, isub<L, 8n>> extends infer ihi0 extends bigint
    ? Mul128<ixor<ixor<W64<S>, ihi0>, 6455697860950631241n>, -7046029288634856825n> extends [infer mh0 extends bigint, infer ml0 extends bigint]
      ? ixor<ihi0, -4466874330221494952n> extends infer ihi extends bigint
        ? iadd<mh0, iadd<ihi, imul<iand<ihi, 4294967295n>, 2246822518n>>> extends infer mh extends bigint
          ? Mul128<ixor<iadd<ml0, ishl<isub<L, 1n>, 54n>>, Bswap64<mh>>, -4417276706812531889n> extends [infer h extends bigint, infer l extends bigint]
            ? [XAval<iadd<h, imul<mh, -4417276706812531889n>>>, XAval<l>]
            : never
          : never
        : never
      : never
    : never;

// 16 bytes at A and at B of S with the secret at KA and KB: [hi, lo]
type Mix32<S extends string, A extends bigint, B extends bigint, KA extends bigint, KB extends bigint, Hi extends bigint, Lo extends bigint> =
  [R64<S, A>, R64<S, iadd<A, 8n>>, R64<S, B>, R64<S, iadd<B, 8n>>] extends [infer a0 extends bigint, infer a1 extends bigint, infer b0 extends bigint, infer b1 extends bigint]
    ? [ixor<iadd<Hi, MulFold<ixor<b0, K<KB>>, ixor<b1, K<iadd<KB, 8n>>>>>, iadd<a0, a1>>,
       ixor<iadd<Lo, MulFold<ixor<a0, K<KA>>, ixor<a1, K<iadd<KA, 8n>>>>>, iadd<b0, b1>>]
    : never;
type MidEnd<L extends bigint, Hi extends bigint, Lo extends bigint> =
  [ineg<XAval<iadd<iadd<imul<Lo, -7046029288634856825n>, imul<Hi, -8796714831421723037n>>, imul<L, -4417276706812531889n>>>>, XAval<iadd<Hi, Lo>>];
// the pairs of 16-byte steps from both ends, the last one first
type Len17to128<S extends string, L extends bigint, J extends bigint, Hi extends bigint, Lo extends bigint> =
  ilt<J, 0n> extends true ? MidEnd<L, Hi, Lo>
  : Mix32<S, ishl<J, 4n>, isub<L, ishl<iadd<J, 1n>, 4n>>, ishl<J, 5n>, iadd<ishl<J, 5n>, 16n>, Hi, Lo> extends [infer H extends bigint, infer Lw extends bigint]
    ? Len17to128<S, L, isub<J, 1n>, H, Lw>
    : never;
type Len129to240<S extends string, L extends bigint, I extends bigint, Hi extends bigint, Lo extends bigint> =
  ilt<I, 128n> extends true
    ? Mix32<S, I, iadd<I, 16n>, I, iadd<I, 16n>, Hi, Lo> extends [infer H extends bigint, infer Lw extends bigint]
      ? I extends 96n ? Len129to240<S, L, 128n, XAval<H>, XAval<Lw>> : Len129to240<S, L, iadd<I, 32n>, H, Lw>
      : never
  : ilt<I, iand<L, -32n>> extends true
    ? Mix32<S, I, iadd<I, 16n>, isub<I, 125n>, isub<I, 109n>, Hi, Lo> extends [infer H extends bigint, infer Lw extends bigint]
      ? Len129to240<S, L, iadd<I, 32n>, H, Lw>
      : never
  : Mix32<S, isub<L, 16n>, isub<L, 32n>, 103n, 119n, Hi, Lo> extends [infer H extends bigint, infer Lw extends bigint]
    ? MidEnd<L, H, Lw>
    : never;

// longer strings: 64-byte stripes into eight accumulators, scrambled after
// every 16 stripes (1024-byte blocks), then the last 64 bytes
type Acc8 = [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
type Words8<S extends string, Ws extends bigint[] = []> =
  Ws extends Acc8 ? [Ws, S]
  : S extends `${infer a}${infer b}${infer c}${infer d}${infer e}${infer f}${infer g}${infer h}${infer R}`
    ? Words8<R, [...Ws, LE64<a, b, c, d, e, f, g, h>]>
    : never;
type StripeAcc<A extends bigint, W extends bigint, W2 extends bigint, KO extends bigint> = iadd<iadd<A, W2>, Mul32<ixor<W, K<KO>>>>;
type Stripe<A extends Acc8, W extends Acc8, KO extends bigint> = [
  StripeAcc<A[0], W[0], W[1], KO>, StripeAcc<A[1], W[1], W[0], iadd<KO, 8n>>,
  StripeAcc<A[2], W[2], W[3], iadd<KO, 16n>>, StripeAcc<A[3], W[3], W[2], iadd<KO, 24n>>,
  StripeAcc<A[4], W[4], W[5], iadd<KO, 32n>>, StripeAcc<A[5], W[5], W[4], iadd<KO, 40n>>,
  StripeAcc<A[6], W[6], W[7], iadd<KO, 48n>>, StripeAcc<A[7], W[7], W[6], iadd<KO, 56n>>,
];
type Scr<A extends bigint, KO extends bigint> = imul<ixor<ixor<A, iushr<A, 47n>>, K<KO>>, 2654435761n>;
type Scramble<A extends Acc8> = [
  Scr<A[0], 128n>, Scr<A[1], 136n>, Scr<A[2], 144n>, Scr<A[3], 152n>,
  Scr<A[4], 160n>, Scr<A[5], 168n>, Scr<A[6], 176n>, Scr<A[7], 184n>,
];
// N stripes left before the last one, C of the current block done
type Stripes<S extends string, A extends Acc8, N extends bigint, C extends bigint> =
  N extends 0n ? A
  : Words8<S> extends [infer W extends Acc8, infer R extends string]
    ? Stripe<A, W, ishl<C, 3n>> extends infer A2 extends Acc8
      ? C extends 15n ? Stripes<R, Scramble<A2>, isub<N, 1n>, 0n> : Stripes<R, A2, isub<N, 1n>, iadd<C, 1n>>
      : never
    : never;
type Merge<A extends Acc8, Start extends bigint, KO extends bigint> = XAval<iadd<iadd<iadd<iadd<Start,
  MulFold<ixor<A[0], K<KO>>, ixor<A[1], K<iadd<KO, 8n>>>>>,
  MulFold<ixor<A[2], K<iadd<KO, 16n>>>, ixor<A[3], K<iadd<KO, 24n>>>>>,
  MulFold<ixor<A[4], K<iadd<KO, 32n>>>, ixor<A[5], K<iadd<KO, 40n>>>>>,
  MulFold<ixor<A[6], K<iadd<KO, 48n>>>, ixor<A[7], K<iadd<KO, 56n>>>>>>;
type LenLong<S extends string, L extends bigint> =
  Stripes<S, [3266489917n, -7046029288634856825n, -4417276706812531889n, 1609587929392839161n,
    -8796714831421723037n, 2246822519n, 2870177450012600261n, 2654435761n], udiv<isub<L, 1n>, 64n>, 0n> extends infer A extends Acc8
    ? Words8<sslice<S, isub<L, 64n>, L> & string> extends [infer W extends Acc8, string]
      ? Stripe<A, W, 121n> extends infer A2 extends Acc8
        ? [Merge<A2, inot<imul<L, -4417276706812531889n>>, 117n>, Merge<A2, imul<L, -7046029288634856825n>, 11n>]
        : never
      : never
    : never;

/** @native shash128 */
export type shash128<S> = shash128_c<S extends string ? S : never>;
type shash128_c<S extends string> =
  slen<S> extends infer L extends bigint
    ? igt<L, 240n> extends true ? LenLong<S, L>
      : igt<L, 128n> extends true ? Len129to240<S, L, 0n, 0n, imul<L, -7046029288634856825n>>
      : igt<L, 16n> extends true ? Len17to128<S, L, udiv<isub<L, 1n>, 32n>, 0n, imul<L, -7046029288634856825n>>
      : igt<L, 8n> extends true ? Len9to16<S, L>
      : igt<L, 3n> extends true ? Len4to8<S, L>
      : L extends 0n ? [-7374073936536430376n, 6918025063187695999n]
      : Len1to3<S, L>
    : never;

type K64 = {
  "0": -4734510112055689544n; "1": 8988705074615774462n; "2": 107169723235645804n;
  "3": -9150895811085458631n; "4": 3206846044944704547n; "5": -635991603978286172n;
  "6": 2447473855086509643n; "7": -5971219860401587010n; "8": 2066345149520216444n;
  "9": -2441886536549236479n; "10": -3108015162914296703n; "11": 7914194659941938988n;
  "12": -1626409839981944329n; "13": -8941494824140493535n; "14": -8033320652366799699n;
  "15": -7525369938742813156n; "16": -2623469361688619810n; "17": 8276375387167616468n;
  "18": 4644015609783511405n; "19": -6611157965513653271n; "20": -6583065893254229885n;
  "21": -5213861871876335728n; "22": -5496743794819540073n; "23": 7472518124495991515n;
  "24": 2262974939099578482n; "25": -3810212738154322880n; "26": 8776142829118792868n;
  "27": -1839215637059881052n; "28": 5685365492914041783n; "29": -3724786431015557197n;
  "30": -4554178371385614489n; "31": -1891287204249351393n; "32": 8711581037947681227n;
  "33": -9045227235349436807n; "34": 6521908138563358438n; "35": -3433288310154277810n;
  "36": 9065845566317379788n; "37": -3711581430728825408n; "38": -14498364963784475n;
  "39": 8286566680123572856n; "40": 2410270004345854594n; "41": -5178731653526335398n;
  "42": 628288925819764176n; "43": 5046485836271438973n; "44": 8378393743697575884n;
  "45": -615790245780032769n; "46": 4897510963931521394n; "47": 2613204287568263201n;
  "48": -8204357891075471176n; "49": -2265833688187779576n; "50": 3882259165203625030n;
  "51": -8055285457383852172n; "52": -1832905809766104073n; "53": -9086416637098318781n;
  "54": 4215904233249082916n; "55": 2754656949352390798n; "56": 5487137525590930912n;
  "57": 4344889773235015733n; "58": 2899275987193816720n; "59": 5920048007935066598n;
  "60": -4948848801086031231n; "61": -7945666784801315270n; "62": -4354493403153806298n;
  "63": 55047854181858380n; "64": -3818837453329782724n; "65": -8589771024315493848n;
  "66": -3420260712846345390n; "67": 7336514198459093435n; "68": -8402080243849837679n;
  "69": 1984792007109443779n; "70": 5988533398925789952n; "71": 3338042034334238923n;
  "72": -6688317018830679928n; "73": 8188439481968977360n; "74": 7237745495519234917n;
  "75": 5216419214072683403n; "76": -7545670736427461861n; "77": -6730831521841467821n;
  "78": 982514005898797870n; "79": -500565212929953373n; "80": 5690594596133299313n;
  "81": 4057454151265110116n; "82": 1817289281226577736n; "83": -1217880312389983593n;
  "84": 5111331831722610082n; "85": -6249044541332063987n; "86": -2402310933491200263n;
  "87": -5990164332231968690n; "88": -2833645246901970632n; "89": -6280079608045441255n;
  "90": -384819531158567185n; "91": 8573350489219836230n; "92": 4573118074737974953n;
  "93": -2071806484620464930n; "94": -7141794803835414356n; "95": 3791154848057698520n;
  "96": 4554437623014685352n; "97": -486612386300594438n; "98": -2523916620961464458n;
  "99": -4909775443879730369n; "100": -4054404076451619613n; "101": -4051062782047603556n;
  "102": 848866664462761780n; "103": 5695865814404364607n; "104": 2111919702937427193n;
  "105": -8494546410135897124n; "106": 5875540889195497403n; "107": -2282891677615274041n;
  "108": 5467459601266838471n; "109": -3653580031866876149n; "110": -5418591349844075185n;
  "111": 6464017090953185821n; "112": 3556072174620004746n; "113": -4021334359191855023n;
  "114": -6933237364981675040n; "115": 9124231484359888203n; "116": -3927526142850255667n;
  "117": -2753530472436770380n; "118": 8708212900181324121n; "119": 8320639771003045937n;
  "120": 7238261902898274248n; "121": -1556992608276218209n; "122": -4185422456575899266n;
  "123": -5997129611619018295n; "124": -8958567948248450855n; "125": 3784058077962335096n;
  "126": -3227810254839716749n; "127": -1453760514566526364n; "128": -4329134394285701654n;
  "129": -4196251135427498811n; "130": -9095648454776683604n; "131": -6881001310379625341n;
  "132": -26878911368670412n; "133": -360392965937173549n; "134": 1439744095735366635n;
  "135": 7139325810128831939n; "136": -1485321483350670907n; "137": 1723580219865931905n;
  "138": 943481457726914464n; "139": -2518330316883232001n; "140": 5898885483309765626n;
  "141": -5237161843349560557n; "142": -1101321574019503261n; "143": -2670433016801847317n;
  "144": 5321830579834785047n; "145": -3221803331004277491n; "146": 1644739493610607069n;
  "147": 6131320256870790993n; "148": 2762139043194663095n; "149": 2965150961192524528n;
  "150": -3158951516726670886n; "151": 7553707719620219721n; "152": -7032137544937171245n;
  "153": 3143064850383918358n; "154": 1597544665906226773n; "155": -4749560797652047578n;
  "156": 6394572897509757993n; "157": 9032178055121889492n; "158": 5151371122220703336n;
  "159": -6825348890156979298n; "160": -242834301215959509n; "161": -8071399103737053674n;
  "162": -535932061014468418n; "163": -5118182661306221224n; "164": -3334642226765412483n;
  "165": 8850058120466833735n; "166": -3424193974287467359n; "167": 3589503944184336380n;
  "168": -3588858202114426737n; "169": 5030012605302946040n; "170": -3799403997270715976n;
  "171": 4236556626373409489n; "172": -8125959076964085638n; "173": -7669846995664752176n;
  "174": 1627364323045527089n; "175": 294587268038608334n; "176": 2883454493032893253n;
  "177": -5825401622958753077n; "178": -2905059236606800070n; "179": -299578263794707057n;
  "180": -3820222711603128683n; "181": -4914839139546299370n; "182": 5457178556493670404n;
  "183": 4633003122163691304n; "184": 9097354517224871855n;
};

// process control has no meaning here: there is one process, no clock, and
// emitted output is just program output
/** @native fork */
export type gfork<H, Timeout> = [H, -1n];
/** @native wait */
export type gwait<H> = [H, -1n, 0n];
// os.Exit: the program ends with its output so far. Not a result tuple, so
// every call passes it on as it does a panic, but deferred calls do not run
// (they see no tstst_panic) and G_fatal takes the output from its heap.
/** @native exit */
export type gexit<H, Code> = { tstst_exit: Code; heap: H };
// a fatal error from now on ends with Note and the error (or signal) in the
// program's output: nothing to do without fatal errors
/** @native crash_note */
export type gcrashnote<H, Note> = H;
// the record a crash of the test Name leaves for the tstst drivers
export type gcrashtag<H, Name> = gcrashnote<H, `\u0001crash:${Name & string}\u0002`>;
/** @native clock_ms */
export type gnowms<H> = [H, 0n];

// goroutines: without threads, a go statement runs its call to the end at
// once, and waiting for another goroutine never ends
/** @native ggo */
export type ggo<H, R> = R extends [infer H2, ...infer _] ? H2 : Panic<"goroutine panicked">;
/** @native gpark */
export type gpark<H> = Panic<"all goroutines are asleep - deadlock!">;
/** @native gwake */
export type gwake<H> = H;
/** @native gyield */
export type gyield<H> = [H];
// waits until every other goroutine is parked: at once, without threads
/** @native gidle */
export type gidle<H, Level> = [H];
