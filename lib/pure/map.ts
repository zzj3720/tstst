// Go maps in plain TypeScript.
//
// A map value is MapV<count, root> (not a tuple, which as a zero value would
// stand for several cells; and an interface, not a type literal: the checkers
// take any type holding a type literal for one that may contain type
// variables, and would walk the heap's trie on every instantiation that
// carries it): root is a persistent 16-ary trie over the hex digits
// of the key's serialization. A node is a 17-tuple: slot 0 holds [key, value]
// for the key ending there (or null), slots 1-16 the children by hex digit.
// The operations on map values (pm*) are natives of tstc. Map variables hold
// a pointer to a heap cell with the map value (or null); the operations on
// them read the cell, use the value and write it back (tstc does that in
// place: hset<H, M, pmput<hget<H, M>, K, V>> changes the map the cell owns).
import type { rterr } from "./rterr";
import type { tget } from "./misc";
import type { Str, Panic, iadd, isub, ilt, ige } from "./int";
import type { CharHex } from "./tables";
import type { slen } from "./str";
import type { hget, hset, halloc, hstoret, Next } from "./heap";

type N17 = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

// self-delimiting serialization of a key
type Ser<K> =
  K extends bigint ? `i${K};`
  : K extends string ? `s${slen<K>}:${K}`
  : K extends true ? "t"
  : K extends false ? "f"
  : K extends null ? "n"
  : K extends unknown[] ? `(${SerAll<K>})`
  : Panic<"unsupported map key">;
type SerAll<T extends unknown[], Acc extends string = ""> = T extends [infer X, ...infer R] ? SerAll<R, `${Acc}${Ser<X>}`> : Acc;

type Hex<S extends string, Acc extends string = ""> =
  S extends `${infer C}${infer R}` ? Hex<R, `${Acc}${CharHex[C & keyof CharHex]}`> : Acc;
type Path<K> = Hex<Ser<K>>;

// Nodes are read and rebuilt by matching all 17 slots at once (as the
// heap's trie nodes are, see heap.ts): no indexed access or mapped type, which
// make the checkers resolve the members of every new node.
// the child of node N for hex digit h (null: none)
type Child<N, h> =
  N extends [infer s0, infer s1, infer s2, infer s3, infer s4, infer s5, infer s6, infer s7, infer s8, infer s9, infer s10, infer s11, infer s12, infer s13, infer s14, infer s15, infer s16]
    ? h extends "0" ? s1 : h extends "1" ? s2 : h extends "2" ? s3 : h extends "3" ? s4 : h extends "4" ? s5 : h extends "5" ? s6 : h extends "6" ? s7 : h extends "7" ? s8 : h extends "8" ? s9 : h extends "9" ? s10 : h extends "a" ? s11 : h extends "b" ? s12 : h extends "c" ? s13 : h extends "d" ? s14 : h extends "e" ? s15 : s16
    : null;
// node N (null: an empty node) with the child for hex digit h replaced by C
type PutC<N, h, C> =
  N extends [infer s0, infer s1, infer s2, infer s3, infer s4, infer s5, infer s6, infer s7, infer s8, infer s9, infer s10, infer s11, infer s12, infer s13, infer s14, infer s15, infer s16]
    ? h extends "0" ? [s0, C, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16]
    : h extends "1" ? [s0, s1, C, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16]
    : h extends "2" ? [s0, s1, s2, C, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16]
    : h extends "3" ? [s0, s1, s2, s3, C, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16]
    : h extends "4" ? [s0, s1, s2, s3, s4, C, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16]
    : h extends "5" ? [s0, s1, s2, s3, s4, s5, C, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16]
    : h extends "6" ? [s0, s1, s2, s3, s4, s5, s6, C, s8, s9, s10, s11, s12, s13, s14, s15, s16]
    : h extends "7" ? [s0, s1, s2, s3, s4, s5, s6, s7, C, s9, s10, s11, s12, s13, s14, s15, s16]
    : h extends "8" ? [s0, s1, s2, s3, s4, s5, s6, s7, s8, C, s10, s11, s12, s13, s14, s15, s16]
    : h extends "9" ? [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, C, s11, s12, s13, s14, s15, s16]
    : h extends "a" ? [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, C, s12, s13, s14, s15, s16]
    : h extends "b" ? [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, C, s13, s14, s15, s16]
    : h extends "c" ? [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, C, s14, s15, s16]
    : h extends "d" ? [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, C, s15, s16]
    : h extends "e" ? [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, C, s16]
    : [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, C]
    : PutC<N17, h, C>;
// node N with slot 0 replaced by KV
type PutKV<N, KV> = N extends [infer s0, infer s1, infer s2, infer s3, infer s4, infer s5, infer s6, infer s7, infer s8, infer s9, infer s10, infer s11, infer s12, infer s13, infer s14, infer s15, infer s16] ? [KV, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16] : PutKV<N17, KV>;
// slot 0 of node N
type KVOf<N> = N extends [infer s0, infer s1, infer s2, infer s3, infer s4, infer s5, infer s6, infer s7, infer s8, infer s9, infer s10, infer s11, infer s12, infer s13, infer s14, infer s15, infer s16] ? s0 : null;

// [key, value] stored for the path, or null
type Find<N, P extends string> =
  [N] extends [null] ? null : P extends `${infer h}${infer R}` ? Find<Child<N, h>, R> : KVOf<N>;

// [node, added]
type Ins<N, P extends string, KV> =
  P extends `${infer h}${infer R}`
    ? Ins<Child<N, h>, R, KV> extends [infer C, infer Added] ? [PutC<N, h, C>, Added] : never
    : [PutKV<N, KV>, KVOf<N> extends null ? true : false];

// [node, removed]
type Del<N, P extends string> =
  [N] extends [null] ? [null, false]
  : P extends `${infer h}${infer R}`
    ? Del<Child<N, h>, R> extends [infer C, infer Removed] ? [PutC<N, h, C>, Removed] : never
    : [PutKV<N, null>, KVOf<N> extends null ? false : true];

// keys in trie order
type Keys<N, Acc extends unknown[] = []> =
  N extends [infer s0, infer s1, infer s2, infer s3, infer s4, infer s5, infer s6, infer s7, infer s8, infer s9, infer s10, infer s11, infer s12, infer s13, infer s14, infer s15, infer s16]
    ? Keys<s16, Keys<s15, Keys<s14, Keys<s13, Keys<s12, Keys<s11, Keys<s10, Keys<s9, Keys<s8, Keys<s7, Keys<s6, Keys<s5, Keys<s4, Keys<s3, Keys<s2, Keys<s1, s0 extends [infer K, unknown] ? [...Acc, K] : Acc>>>>>>>>>>>>>>>>
    : Acc;

/** @native pmap_empty */
export type mnew = MapV<0n, null>;
interface MapV<N, T> { n: N; t: T }

// [count, root] of a map value (read by indexed access: matching the
// reference would relate it, and a relation from a type reference walks its
// type arguments, here the trie)
type MV<Mv> = Mv extends null ? Panic<"not a map"> : [Mv["n" & keyof Mv], Mv["t" & keyof Mv]];

// the entry [key, value] of K in the map value, or null
/** @native pmap_get */
export type pmget<Mv, K> = MV<Mv> extends [bigint, infer Root] ? Find<Root, Path<K>> : null;

// the map value with K set to V
/** @native pmap_put */
export type pmput<Mv, K, V> =
  MV<Mv> extends [infer C extends bigint, infer Root]
    ? Ins<Root, Path<K>, [K, V]> extends [infer R2, infer Added] ? MapV<Added extends true ? iadd<C, 1n> : C, R2> : never
    : never;

// the map value without K
/** @native pmap_del */
export type pmdel<Mv, K> =
  MV<Mv> extends [infer C extends bigint, infer Root]
    ? Del<Root, Path<K>> extends [infer R2, infer Removed] ? Removed extends true ? MapV<isub<C, 1n>, R2> : Mv : never
    : never;

/** @native pmap_len */
export type pmlen<Mv> = MV<Mv>[0];

// the keys, in the order of their serializations
/** @native pmap_keys */
export type pmkeys<Mv> = Keys<MV<Mv>[1]>;

// one step of a range over a map value: from index I of the keys Ks (N of
// them), the next key still in the map: [true, index after it, key, value],
// or [false, N, null, null]
/** @native pmap_step */
export type pmstep<Mv, Ks, I, N> =
  ilt<I, N> extends true
    ? tget<Ks, I> extends infer K
      ? pmget<Mv, K> extends [unknown, infer V] ? [true, iadd<I, 1n>, K, V] : pmstep<Mv, Ks, iadd<I, 1n>, N>
      : never
    : [false, N, null, null];

// (the operations on cells use only patterns tstc compiles inline: their
// results stay simple values)
export type mlookup<H, M, K, Z> =
  M extends null ? Z : pmget<hget<H, M>, K> extends [infer _K, infer V] ? V : Z;

export type mlookup2<H, M, K, Z> =
  M extends null ? [Z, false] : pmget<hget<H, M>, K> extends [infer _K, infer V] ? [V, true] : [Z, false];

export type mlen_<H, M> = M extends null ? 0n : pmlen<hget<H, M>>;

export type mupdate<H, M, K, V> =
  M extends null ? rterr<"assignment to entry in nil map"> : hset<H, M, pmput<hget<H, M>, K, V>>;

export type mdelete<H, M, K> = M extends null ? H : hset<H, M, pmdel<hget<H, M>, K>>;

// range over a map: the iterator cell holds [keys, map pointer, index of the
// next key, count of keys]
export type mrange<H, M> =
  M extends null ? halloc<H, [[[], M, 0n, 0n]], 1n> : halloc<H, [[pmkeys<hget<H, M>>, M, 0n, pmlen<hget<H, M>>]], 1n>;

// [heap, ok, key, value]; keys deleted during the range are skipped
export type mnext<H, It> =
  hget<H, It> extends [infer Ks, infer M, infer I, infer N]
    ? M extends null ? [H, false, null, null]
    : pmstep<hget<H, M>, Ks, I, N> extends [infer Ok, infer I2, infer K, infer V]
      ? Ok extends true ? [hset<H, It, [Ks, M, I2, N]>, true, K, V] : [H, false, null, null]
      : never
    : Panic<"mnext: bad iterator">;

// stores the keys of the map at M at Dst, Dst + Stride, ... (reflect)
export type hstorekeys<H, M, Dst, L, Stride> = M extends null ? H : StoreKeys<H, pmkeys<hget<H, M>>, Dst, L, Stride>;
type StoreKeys<H, Ks, P, L, Stride> =
  Ks extends [infer K, ...infer R] ? StoreKeys<hstoret<H, P, K, L>, R, iadd<P, Stride>, L, Stride> : H;
