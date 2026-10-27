// The memory of a compiled Go program, in plain TypeScript.
//
// The heap is a persistent 10-ary trie over 8-digit decimal cell addresses;
// a stored cell X sits in its leaf slot as [X] (an empty slot is null).
// Cell 0 holds the allocation pointer. Pointers are bigint cell addresses
// or null; slices are [ptr | null, len, cap]; multi-cell values (structs,
// arrays) are laid out flat, described by layouts: "s" one cell, "(...)" a
// struct, "[N...]" an array of N elements (arrays are tuples as values).
import type { Str, Big, Rev, Panic, iadd, isub, imul, idiv, ilt, ile, igt, ige, ieq, iand, iushr } from "./int";
import type { ByteChar, CharByte, NextT } from "./tables";
import type { slen, runestr, decoderune } from "./str";
import type { rterr } from "./rterr";

type NilErr = rterr<"invalid memory address or nil pointer dereference">;

type N10 = [null, null, null, null, null, null, null, null, null, null];

// k inferred placeholders match strings of at least k - 1 characters (each
// but the last takes one)
type Pad8<S extends string> =
  S extends `${infer _0}${infer _1}${infer _2}${infer _3}${infer _4}${infer _5}${infer _6}${infer R}` ? R extends "" ? `0${S}` : R extends `${string}${infer R2}` ? R2 extends "" ? S : Panic<"heap address out of range"> : never
  : S extends `${infer _0}${infer _1}${infer _2}${infer _3}${infer _4}${infer _5}${infer R}` ? `00${S}`
  : S extends `${infer _0}${infer _1}${infer _2}${infer _3}${infer _4}${infer R}` ? `000${S}`
  : S extends `${infer _0}${infer _1}${infer _2}${infer _3}${infer R}` ? `0000${S}`
  : S extends `${infer _0}${infer _1}${infer _2}${infer R}` ? `00000${S}`
  : S extends `${infer _0}${infer _1}${infer R}` ? `000000${S}`
  : S extends `${infer _0}${infer R}` ? `0000000${S}`
  : never;
// The trie's nodes are read and rebuilt by matching all ten slots at once:
// the checkers then compare the node with itself, while an indexed access
// (or a mapped type over it) makes them resolve the members of every new
// node (a tuple's members include those of Array) at every level.
// slot D of node N (null: an empty node)
type At<N, D> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? D extends "0" ? a0 : D extends "1" ? a1 : D extends "2" ? a2 : D extends "3" ? a3 : D extends "4" ? a4 : D extends "5" ? a5 : D extends "6" ? a6 : D extends "7" ? a7 : D extends "8" ? a8 : a9
    : null;
// node N with slot D replaced by X
type Put<N, D, X> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? D extends "0" ? [X, a1, a2, a3, a4, a5, a6, a7, a8, a9]
    : D extends "1" ? [a0, X, a2, a3, a4, a5, a6, a7, a8, a9]
    : D extends "2" ? [a0, a1, X, a3, a4, a5, a6, a7, a8, a9]
    : D extends "3" ? [a0, a1, a2, X, a4, a5, a6, a7, a8, a9]
    : D extends "4" ? [a0, a1, a2, a3, X, a5, a6, a7, a8, a9]
    : D extends "5" ? [a0, a1, a2, a3, a4, X, a6, a7, a8, a9]
    : D extends "6" ? [a0, a1, a2, a3, a4, a5, X, a7, a8, a9]
    : D extends "7" ? [a0, a1, a2, a3, a4, a5, a6, X, a8, a9]
    : D extends "8" ? [a0, a1, a2, a3, a4, a5, a6, a7, X, a9]
    : [a0, a1, a2, a3, a4, a5, a6, a7, a8, X]
    : Put<N10, D, X>;
// the cell at the address with 8 digits S in trie T of depth K: [value], or
// null (none); the usual depths first
type GetK<T, K, S> =
  K extends "5" ? S extends `000${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}` ? At<At<At<At<At<T, d3>, d4>, d5>, d6>, d7> : null
  : K extends "6" ? S extends `00${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}` ? At<At<At<At<At<At<T, d2>, d3>, d4>, d5>, d6>, d7> : null
  : K extends "4" ? S extends `0000${infer d4}${infer d5}${infer d6}${infer d7}` ? At<At<At<At<T, d4>, d5>, d6>, d7> : null
  : K extends "7" ? S extends `0${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}` ? At<At<At<At<At<At<At<T, d1>, d2>, d3>, d4>, d5>, d6>, d7> : null
  : K extends "3" ? S extends `00000${infer d5}${infer d6}${infer d7}` ? At<At<At<T, d5>, d6>, d7> : null
  : K extends "8" ? S extends `${infer d0}${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}` ? At<At<At<At<At<At<At<At<T, d0>, d1>, d2>, d3>, d4>, d5>, d6>, d7> : null
  : K extends "2" ? S extends `000000${infer d6}${infer d7}` ? At<At<T, d6>, d7> : null
  : K extends "1" ? S extends `0000000${infer d7}` ? At<T, d7> : null
  : null;
// heap [K, T] with V at the address with 8 digits S (a trie too shallow for
// the address grows: its root becomes the first child of a new root)
type SetK<T, K, S, V> =
  K extends "5" ? S extends `000${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}` ? Set5<T, d3, d4, d5, d6, d7, [V]> extends infer R ? [K, R] : never : SetK<[T, null, null, null, null, null, null, null, null, null], "6", S, V>
  : K extends "6" ? S extends `00${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}` ? Set6<T, d2, d3, d4, d5, d6, d7, [V]> extends infer R ? [K, R] : never : SetK<[T, null, null, null, null, null, null, null, null, null], "7", S, V>
  : K extends "4" ? S extends `0000${infer d4}${infer d5}${infer d6}${infer d7}` ? Set4<T, d4, d5, d6, d7, [V]> extends infer R ? [K, R] : never : SetK<[T, null, null, null, null, null, null, null, null, null], "5", S, V>
  : K extends "7" ? S extends `0${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}` ? Set7<T, d1, d2, d3, d4, d5, d6, d7, [V]> extends infer R ? [K, R] : never : SetK<[T, null, null, null, null, null, null, null, null, null], "8", S, V>
  : K extends "3" ? S extends `00000${infer d5}${infer d6}${infer d7}` ? Set3<T, d5, d6, d7, [V]> extends infer R ? [K, R] : never : SetK<[T, null, null, null, null, null, null, null, null, null], "4", S, V>
  : K extends "8" ? S extends `${infer d0}${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}` ? Set8<T, d0, d1, d2, d3, d4, d5, d6, d7, [V]> extends infer R ? [K, R] : never : never
  : K extends "2" ? S extends `000000${infer d6}${infer d7}` ? Set2<T, d6, d7, [V]> extends infer R ? [K, R] : never : SetK<[T, null, null, null, null, null, null, null, null, null], "3", S, V>
  : K extends "1" ? S extends `0000000${infer d7}` ? Set1<T, d7, [V]> extends infer R ? [K, R] : never : SetK<[T, null, null, null, null, null, null, null, null, null], "2", S, V>
  : never;
// node N (null: empty) with X put below it at the digits d0.. (a cell's leaf
// [V], or a node): one pass down and up, a node matched once per level
type Set1<N, d0, V> = Put<N, d0, V>;
type Set2<N, d0, d1, V> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? d0 extends "0" ? Set1<a0, d1, V> extends infer C ? [C, a1, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "1" ? Set1<a1, d1, V> extends infer C ? [a0, C, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "2" ? Set1<a2, d1, V> extends infer C ? [a0, a1, C, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "3" ? Set1<a3, d1, V> extends infer C ? [a0, a1, a2, C, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "4" ? Set1<a4, d1, V> extends infer C ? [a0, a1, a2, a3, C, a5, a6, a7, a8, a9] : never
    : d0 extends "5" ? Set1<a5, d1, V> extends infer C ? [a0, a1, a2, a3, a4, C, a6, a7, a8, a9] : never
    : d0 extends "6" ? Set1<a6, d1, V> extends infer C ? [a0, a1, a2, a3, a4, a5, C, a7, a8, a9] : never
    : d0 extends "7" ? Set1<a7, d1, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, C, a8, a9] : never
    : d0 extends "8" ? Set1<a8, d1, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, C, a9] : never
    : Set1<a9, d1, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, a8, C] : never
    : Set2<N10, d0, d1, V>;
type Set3<N, d0, d1, d2, V> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? d0 extends "0" ? Set2<a0, d1, d2, V> extends infer C ? [C, a1, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "1" ? Set2<a1, d1, d2, V> extends infer C ? [a0, C, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "2" ? Set2<a2, d1, d2, V> extends infer C ? [a0, a1, C, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "3" ? Set2<a3, d1, d2, V> extends infer C ? [a0, a1, a2, C, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "4" ? Set2<a4, d1, d2, V> extends infer C ? [a0, a1, a2, a3, C, a5, a6, a7, a8, a9] : never
    : d0 extends "5" ? Set2<a5, d1, d2, V> extends infer C ? [a0, a1, a2, a3, a4, C, a6, a7, a8, a9] : never
    : d0 extends "6" ? Set2<a6, d1, d2, V> extends infer C ? [a0, a1, a2, a3, a4, a5, C, a7, a8, a9] : never
    : d0 extends "7" ? Set2<a7, d1, d2, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, C, a8, a9] : never
    : d0 extends "8" ? Set2<a8, d1, d2, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, C, a9] : never
    : Set2<a9, d1, d2, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, a8, C] : never
    : Set3<N10, d0, d1, d2, V>;
type Set4<N, d0, d1, d2, d3, V> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? d0 extends "0" ? Set3<a0, d1, d2, d3, V> extends infer C ? [C, a1, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "1" ? Set3<a1, d1, d2, d3, V> extends infer C ? [a0, C, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "2" ? Set3<a2, d1, d2, d3, V> extends infer C ? [a0, a1, C, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "3" ? Set3<a3, d1, d2, d3, V> extends infer C ? [a0, a1, a2, C, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "4" ? Set3<a4, d1, d2, d3, V> extends infer C ? [a0, a1, a2, a3, C, a5, a6, a7, a8, a9] : never
    : d0 extends "5" ? Set3<a5, d1, d2, d3, V> extends infer C ? [a0, a1, a2, a3, a4, C, a6, a7, a8, a9] : never
    : d0 extends "6" ? Set3<a6, d1, d2, d3, V> extends infer C ? [a0, a1, a2, a3, a4, a5, C, a7, a8, a9] : never
    : d0 extends "7" ? Set3<a7, d1, d2, d3, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, C, a8, a9] : never
    : d0 extends "8" ? Set3<a8, d1, d2, d3, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, C, a9] : never
    : Set3<a9, d1, d2, d3, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, a8, C] : never
    : Set4<N10, d0, d1, d2, d3, V>;
type Set5<N, d0, d1, d2, d3, d4, V> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? d0 extends "0" ? Set4<a0, d1, d2, d3, d4, V> extends infer C ? [C, a1, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "1" ? Set4<a1, d1, d2, d3, d4, V> extends infer C ? [a0, C, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "2" ? Set4<a2, d1, d2, d3, d4, V> extends infer C ? [a0, a1, C, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "3" ? Set4<a3, d1, d2, d3, d4, V> extends infer C ? [a0, a1, a2, C, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "4" ? Set4<a4, d1, d2, d3, d4, V> extends infer C ? [a0, a1, a2, a3, C, a5, a6, a7, a8, a9] : never
    : d0 extends "5" ? Set4<a5, d1, d2, d3, d4, V> extends infer C ? [a0, a1, a2, a3, a4, C, a6, a7, a8, a9] : never
    : d0 extends "6" ? Set4<a6, d1, d2, d3, d4, V> extends infer C ? [a0, a1, a2, a3, a4, a5, C, a7, a8, a9] : never
    : d0 extends "7" ? Set4<a7, d1, d2, d3, d4, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, C, a8, a9] : never
    : d0 extends "8" ? Set4<a8, d1, d2, d3, d4, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, C, a9] : never
    : Set4<a9, d1, d2, d3, d4, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, a8, C] : never
    : Set5<N10, d0, d1, d2, d3, d4, V>;
type Set6<N, d0, d1, d2, d3, d4, d5, V> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? d0 extends "0" ? Set5<a0, d1, d2, d3, d4, d5, V> extends infer C ? [C, a1, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "1" ? Set5<a1, d1, d2, d3, d4, d5, V> extends infer C ? [a0, C, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "2" ? Set5<a2, d1, d2, d3, d4, d5, V> extends infer C ? [a0, a1, C, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "3" ? Set5<a3, d1, d2, d3, d4, d5, V> extends infer C ? [a0, a1, a2, C, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "4" ? Set5<a4, d1, d2, d3, d4, d5, V> extends infer C ? [a0, a1, a2, a3, C, a5, a6, a7, a8, a9] : never
    : d0 extends "5" ? Set5<a5, d1, d2, d3, d4, d5, V> extends infer C ? [a0, a1, a2, a3, a4, C, a6, a7, a8, a9] : never
    : d0 extends "6" ? Set5<a6, d1, d2, d3, d4, d5, V> extends infer C ? [a0, a1, a2, a3, a4, a5, C, a7, a8, a9] : never
    : d0 extends "7" ? Set5<a7, d1, d2, d3, d4, d5, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, C, a8, a9] : never
    : d0 extends "8" ? Set5<a8, d1, d2, d3, d4, d5, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, C, a9] : never
    : Set5<a9, d1, d2, d3, d4, d5, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, a8, C] : never
    : Set6<N10, d0, d1, d2, d3, d4, d5, V>;
type Set7<N, d0, d1, d2, d3, d4, d5, d6, V> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? d0 extends "0" ? Set6<a0, d1, d2, d3, d4, d5, d6, V> extends infer C ? [C, a1, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "1" ? Set6<a1, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, C, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "2" ? Set6<a2, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, a1, C, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "3" ? Set6<a3, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, a1, a2, C, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "4" ? Set6<a4, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, a1, a2, a3, C, a5, a6, a7, a8, a9] : never
    : d0 extends "5" ? Set6<a5, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, a1, a2, a3, a4, C, a6, a7, a8, a9] : never
    : d0 extends "6" ? Set6<a6, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, a1, a2, a3, a4, a5, C, a7, a8, a9] : never
    : d0 extends "7" ? Set6<a7, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, C, a8, a9] : never
    : d0 extends "8" ? Set6<a8, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, C, a9] : never
    : Set6<a9, d1, d2, d3, d4, d5, d6, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, a8, C] : never
    : Set7<N10, d0, d1, d2, d3, d4, d5, d6, V>;
type Set8<N, d0, d1, d2, d3, d4, d5, d6, d7, V> =
  N extends [infer a0, infer a1, infer a2, infer a3, infer a4, infer a5, infer a6, infer a7, infer a8, infer a9]
    ? d0 extends "0" ? Set7<a0, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [C, a1, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "1" ? Set7<a1, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, C, a2, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "2" ? Set7<a2, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, a1, C, a3, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "3" ? Set7<a3, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, a1, a2, C, a4, a5, a6, a7, a8, a9] : never
    : d0 extends "4" ? Set7<a4, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, a1, a2, a3, C, a5, a6, a7, a8, a9] : never
    : d0 extends "5" ? Set7<a5, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, a1, a2, a3, a4, C, a6, a7, a8, a9] : never
    : d0 extends "6" ? Set7<a6, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, a1, a2, a3, a4, a5, C, a7, a8, a9] : never
    : d0 extends "7" ? Set7<a7, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, C, a8, a9] : never
    : d0 extends "8" ? Set7<a8, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, C, a9] : never
    : Set7<a9, d1, d2, d3, d4, d5, d6, d7, V> extends infer C ? [a0, a1, a2, a3, a4, a5, a6, a7, a8, C] : never
    : Set8<N10, d0, d1, d2, d3, d4, d5, d6, d7, V>;

// The heap is [K, trie]: a trie of depth K holds the addresses below 10^K
// (a checker walks the levels an address needs, not all eight).
/** @native hget */
export type hget<H, P> =
  [P] extends [null] ? NilErr
  : H extends [infer K, infer T] ? GetK<T, K, Pad8<Str<P & bigint>>> extends [infer V] ? V : Panic<"load of unallocated cell">
  : never;

/** @native hset */
export type hset<H, P, V> =
  [P] extends [null] ? NilErr
  : H extends [infer K, infer T] ? SetK<T, K, Pad8<Str<P & bigint>>, V> : never;

/** @native padd */
export type padd<P, Off> = padd_c<P, Off extends bigint ? Off : never>;
type padd_c<P, Off extends bigint> =
  [P] extends [null] ? NilErr : iadd<P & bigint, Off>;

// the cell at P + Off (a field of what P points to), and a store into it
/** @native hgetf */
export type hgetf<H, P, Off> = hgetf_c<H, P, Off extends bigint ? Off : never>;
type hgetf_c<H, P, Off extends bigint> =
  [P] extends [null] ? NilErr : hget<H, iadd<P & bigint, Off>>;
/** @native hsetf */
export type hsetf<H, P, Off, V> = hsetf_c<H, P, Off extends bigint ? Off : never, V>;
type hsetf_c<H, P, Off extends bigint, V> =
  [P] extends [null] ? NilErr : hset<H, iadd<P & bigint, Off>, V>;

type Len<T extends unknown[]> = Big<`${T["length"]}`>;

// cells of a zero pattern: a tuple of cells, or one scalar cell
type ZeroCells<Z> = Z extends unknown[] ? Z : [Z];

// Tuples are walked by index: a tuple's members are resolved once for all
// its indexed accesses, while every step of a walk by `...infer R` makes the
// checkers (tsc, tsgo) resolve the members of a new tuple R (to check it
// against the implied unknown[] constraint), at a cost of R's length squared.
// The counters are number literals, compared with the tuple's length.
// index I (a bigint) as a number literal
type Ix<I extends bigint> = `${I}` extends `${infer N extends number}` ? N : never;
// I + 1 (a table lookup for the usual lengths: bigint arithmetic in
// TypeScript costs a checker a hundred conditional types)
export type Next<I extends number> =
  I extends keyof NextT ? NextT[I] : `${iadd<Big<`${I}`>, 1n>}` extends `${infer N extends number}` ? N : never;

// Runs of cells are written at addresses counted as 8 digits (Pad8): a
// bigint address costs a checker its decimal conversions and an iadd per cell.
// the next address
type Inc8<S> = S extends `${infer a}${infer b}${infer c}${infer d}${infer e}${infer f}${infer g}${infer h}` ? h extends "9" ? g extends "9" ? f extends "9" ? e extends "9" ? d extends "9" ? c extends "9" ? b extends "9" ? a extends "9" ? Panic<"heap address out of range"> : `${Succ10[a & keyof Succ10]}0000000` : `${a}${Succ10[b & keyof Succ10]}000000` : `${a}${b}${Succ10[c & keyof Succ10]}00000` : `${a}${b}${c}${Succ10[d & keyof Succ10]}0000` : `${a}${b}${c}${d}${Succ10[e & keyof Succ10]}000` : `${a}${b}${c}${d}${e}${Succ10[f & keyof Succ10]}00` : `${a}${b}${c}${d}${e}${f}${Succ10[g & keyof Succ10]}0` : `${a}${b}${c}${d}${e}${f}${g}${Succ10[h & keyof Succ10]}` : never;
// the heap with V at the address with digits S
type HSetS<H, S, V> = H extends [infer K, infer T] ? SetK<T, K, S, V> : never;
type AddrOf<S extends string> = Big<StripZ<S>>;

// stores the cells at P, P+1, ...: [heap, next address]
type StoreCells<H, P extends bigint, Cells extends unknown[]> =
  StoreFrom<H, Pad8<Str<P>>, Cells, 0> extends [infer H2, infer S extends string] ? AddrOf<S> extends infer P2 ? [H2, P2] : never : never;
// [heap, digits of the next address]
type StoreFrom<H, S, Cells extends unknown[], I extends number> =
  I extends Cells["length"] ? [H, S]
  : H extends [infer K, infer T]
    ? Fits<S, K> extends true
      ? S extends `${infer Pre}${infer _0}${infer _1}${infer _2}${infer _3}${infer _4}${infer _5}${infer D}`
        ? PutCells<GetNode<T, K, S>, D, Cells, I> extends [infer L, infer D2 extends string, infer I2 extends number]
          ? SetNode<T, K, S, L> extends infer T2
            ? StoreFrom<[K, T2], NextS<`${Pre}${_0}${_1}${_2}${_3}${_4}${_5}`, D2>, Cells, I2>
            : never
          : never
        : never
      : StoreFrom<HSetS<H, S, Cells[I]>, Inc8<S>, Cells, Next<I>>
    : never;

// Runs of cells are written a node of ten leaves at a time (the node at
// depth K - 1 above the address, taken once, its slots put, and set back
// once) where the trie is deep enough for the address (Fits), a cell at a
// time (HSetS, growing the trie) otherwise.
// whether the 8 digits S address a cell of a trie of depth K
type Fits<S, K> =
  K extends "5" ? S extends `000${string}` ? true : false
  : K extends "6" ? S extends `00${string}` ? true : false
  : K extends "4" ? S extends `0000${string}` ? true : false
  : K extends "7" ? S extends `0${string}` ? true : false
  : K extends "3" ? S extends `00000${string}` ? true : false
  : K extends "8" ? true
  : K extends "2" ? S extends `000000${string}` ? true : false
  : K extends "1" ? S extends `0000000${string}` ? true : false
  : false;
// the node at depth K - 1 above the cell at the 8 digits S (it fits)
type GetNode<T, K, S> =
  K extends "5" ? S extends `000${infer d3}${infer d4}${infer d5}${infer d6}${string}` ? At<At<At<At<T, d3>, d4>, d5>, d6> : null
  : K extends "6" ? S extends `00${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${string}` ? At<At<At<At<At<T, d2>, d3>, d4>, d5>, d6> : null
  : K extends "4" ? S extends `0000${infer d4}${infer d5}${infer d6}${string}` ? At<At<At<T, d4>, d5>, d6> : null
  : K extends "7" ? S extends `0${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${string}` ? At<At<At<At<At<At<T, d1>, d2>, d3>, d4>, d5>, d6> : null
  : K extends "3" ? S extends `00000${infer d5}${infer d6}${string}` ? At<At<T, d5>, d6> : null
  : K extends "8" ? S extends `${infer d0}${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${string}` ? At<At<At<At<At<At<At<T, d0>, d1>, d2>, d3>, d4>, d5>, d6> : null
  : K extends "2" ? S extends `000000${infer d6}${string}` ? At<T, d6> : null
  : T;
// trie T of depth K with node X at depth K - 1 above the cell at S (it fits)
type SetNode<T, K, S, X> =
  K extends "5" ? S extends `000${infer d3}${infer d4}${infer d5}${infer d6}${string}` ? Set4<T, d3, d4, d5, d6, X> : never
  : K extends "6" ? S extends `00${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${string}` ? Set5<T, d2, d3, d4, d5, d6, X> : never
  : K extends "4" ? S extends `0000${infer d4}${infer d5}${infer d6}${string}` ? Set3<T, d4, d5, d6, X> : never
  : K extends "7" ? S extends `0${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${string}` ? Set6<T, d1, d2, d3, d4, d5, d6, X> : never
  : K extends "3" ? S extends `00000${infer d5}${infer d6}${string}` ? Set2<T, d5, d6, X> : never
  : K extends "8" ? S extends `${infer d0}${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${string}` ? Set7<T, d0, d1, d2, d3, d4, d5, d6, X> : never
  : K extends "2" ? S extends `000000${infer d6}${string}` ? Set1<T, d6, X> : never
  : X;
// the digits of the address after a run that ended before slot D of the node
// whose cells have the 7 digits Pre ("10": the node is full)
type NextS<Pre extends string, D extends string> = D extends "10" ? Inc8<`${Pre}9`> : `${Pre}${D}`;
// node L with Cells[I], Cells[I + 1], ... from slot D: [node, next slot, next I]
type PutCells<L, D extends string, Cells extends unknown[], I extends number> =
  D extends "10" ? [L, D, I]
  : I extends Cells["length"] ? [L, D, I]
  : PutCells<Put<L, D, [Cells[I]]>, Succ10[D & keyof Succ10], Cells, Next<I>>;
// node L with V in at most C slots from D: [node, next slot, slots written]
type PutFill<L, D extends string, V, C extends number, I extends number = 0> =
  D extends "10" ? [L, D, I]
  : I extends C ? [L, D, I]
  : PutFill<Put<L, D, [V]>, Succ10[D & keyof Succ10], V, C, Next<I>>;
// node L with the bytes of S in at most C slots from D: [node, next slot, slots written, rest of S]
type PutStr<L, D extends string, S extends string, C extends number, I extends number = 0> =
  D extends "10" ? [L, D, I, S]
  : I extends C ? [L, D, I, S]
  : S extends `${infer X}${infer R}` ? PutStr<Put<L, D, [CharByte[X & keyof CharByte]]>, Succ10[D & keyof Succ10], R, C, Next<I>>
  : [L, D, I, S];
// at most ten of N (a count of cells)
type Upto10<N extends bigint> = ige<N, 10n> extends true ? 10 : Ix<N>;

// N times the cells
type FillN<H, P extends bigint, N extends bigint, Cells extends unknown[]> =
  FillS<H, Pad8<Str<P>>, N, Cells> extends [infer H2, infer S extends string] ? AddrOf<S> extends infer P2 ? [H2, P2] : never : never;
type FillS<H, S, N extends bigint, Cells extends unknown[]> =
  ile<N, 0n> extends true ? [H, S]
  : Cells extends [infer V] ? FillV<H, S, N, V>
  : StoreFrom<H, S, Cells, 0> extends [infer H2, infer S2] ? FillS<H2, S2, isub<N, 1n>, Cells> : never;
// N cells V from the address with digits S: [heap, digits of the next address]
type FillV<H, S, N extends bigint, V> =
  ile<N, 0n> extends true ? [H, S]
  : H extends [infer K, infer T]
    ? Fits<S, K> extends true
      ? S extends `${infer Pre}${infer _0}${infer _1}${infer _2}${infer _3}${infer _4}${infer _5}${infer D}`
        ? PutFill<GetNode<T, K, S>, D, V, Upto10<N>> extends [infer L, infer D2 extends string, infer C extends number]
          ? SetNode<T, K, S, L> extends infer T2
            ? FillV<[K, T2], NextS<`${Pre}${_0}${_1}${_2}${_3}${_4}${_5}`, D2>, isub<N, Big<`${C}`>>, V>
            : never
          : never
        : never
      : FillV<HSetS<H, S, V>, Inc8<S>, isub<N, 1n>, V>
    : never;

// the N cells at P, as a tuple
type LoadN<H, P extends bigint, N extends bigint> = LoadRun<H, Pad8<Str<P>>, N, []> extends [infer V extends unknown[], infer _] ? V : never;
// (a node of ten leaves at a time, as runs are written)
// [values, digits of the next address]
type LoadRun<H, A, N extends bigint, Acc extends unknown[]> =
  ile<N, 0n> extends true ? [Acc, A]
  : H extends [infer K, infer T]
    ? Fits<A, K> extends true
      ? A extends `${infer Pre}${infer _0}${infer _1}${infer _2}${infer _3}${infer _4}${infer _5}${infer D}`
        ? TakeCells<GetNode<T, K, A>, D, Upto10<N>, Acc> extends [infer Acc2 extends unknown[], infer D2 extends string, infer C extends number]
          ? LoadRun<H, NextS<`${Pre}${_0}${_1}${_2}${_3}${_4}${_5}`, D2>, isub<N, Big<`${C}`>>, Acc2>
          : never
        : never
      : LoadRun<H, Inc8<A>, isub<N, 1n>, [...Acc, Cell<null>]>
    : never;
// the value of a leaf (as hget: none for an unallocated cell)
type Cell<Leaf> = Leaf extends [infer V] ? V : Panic<"load of unallocated cell">;
// Acc with the values of at most C slots of node L from D: [values, next slot, slots read]
type TakeCells<L, D extends string, C extends number, Acc extends unknown[], I extends number = 0> =
  D extends "10" ? [Acc, D, I]
  : I extends C ? [Acc, D, I]
  : TakeCells<L, Succ10[D & keyof Succ10], C, [...Acc, Cell<At<L, D>>], Next<I>>;

/**
 * A fresh heap: cell 0 is the allocation pointer, then the runs [count, pattern].
 *
 * The heap is a store of cells, which a compiler may implement as an array
 * updated in place (tstc does). References to cells are their indices, and
 * programs use every version of the heap once (a write makes the next). A
 * cell allocated with a bigint, number, string or boolean (the zero value of
 * a Go type without pointers) never holds a reference. The address an
 * allocation gets is not observable (Go programs only compare and use them),
 * so cells nothing refers to may be freed and reused. Cells hold Go values,
 * which are never unions (nor any or unknown).
 * @store cells
 * @store-ref bigint
 * @store-linear
 * @store-scalar bigint number string boolean
 * @store-reuse
 * @store-simple
 * @native hinit
 */
export type hinit<Runs extends unknown[]> =
  Finish<BuildRuns<Push<["00000000", null, null, null, null, null, null, null, null], 1n>, Runs, 0>> extends [infer T, infer P]
    ? hset<Shallow<T, "8">, 0n, P>
    : never;
// heap [K, T] of trie T of depth K without its levels that hold only a first child
type Shallow<T, K> =
  K extends "1" ? [K, T] : T extends [infer C, null, null, null, null, null, null, null, null, null] ? Shallow<C, Pred10[K & keyof Pred10]> : [K, T];

// hinit builds the trie in one pass over the cells, bottom up (a write per
// cell walks all eight levels): the state is [counter, b0, ..., b7], the
// counter the address of the next cell as 8 decimal digits, least significant
// first, and bk the nodes of level k so far for the current node of level
// k + 1 (as a list [last, [..., [first, null]]]; level 0 holds the cells).
type Succ10 = { "0": "1"; "1": "2"; "2": "3"; "3": "4"; "4": "5"; "5": "6"; "6": "7"; "7": "8"; "8": "9"; "9": "10" };
type Pred10 = { "1": "0"; "2": "1"; "3": "2"; "4": "3"; "5": "4"; "6": "5"; "7": "6"; "8": "7"; "9": "8" };
// counters as decimal digits, least significant first
type IncR<C extends string> = C extends `${infer d}${infer R}` ? d extends "9" ? `0${IncR<R>}` : `${Succ10[d & keyof Succ10]}${R}` : "";
type DecR<C extends string> = C extends `${infer d}${infer R}` ? d extends "0" ? `9${DecR<R>}` : `${Pred10[d & keyof Pred10]}${R}` : never;
type IsZeroR<C extends string> = C extends `0${infer R}` ? IsZeroR<R> : C extends "" ? true : false;
type StripZ<S extends string> = S extends `0${infer R}` ? R extends "" ? "0" : StripZ<R> : S;
// the node of the K (a digit string, or "10") nodes of list B, then empty slots
type NodeOf<B, K> =
  K extends "1" ? B extends [infer x0, infer _] ? [x0, null, null, null, null, null, null, null, null, null] : never
  : K extends "2" ? B extends [infer x1, [infer x0, infer _]] ? [x0, x1, null, null, null, null, null, null, null, null] : never
  : K extends "3" ? B extends [infer x2, [infer x1, [infer x0, infer _]]] ? [x0, x1, x2, null, null, null, null, null, null, null] : never
  : K extends "4" ? B extends [infer x3, [infer x2, [infer x1, [infer x0, infer _]]]] ? [x0, x1, x2, x3, null, null, null, null, null, null] : never
  : K extends "5" ? B extends [infer x4, [infer x3, [infer x2, [infer x1, [infer x0, infer _]]]]] ? [x0, x1, x2, x3, x4, null, null, null, null, null] : never
  : K extends "6" ? B extends [infer x5, [infer x4, [infer x3, [infer x2, [infer x1, [infer x0, infer _]]]]]] ? [x0, x1, x2, x3, x4, x5, null, null, null, null] : never
  : K extends "7" ? B extends [infer x6, [infer x5, [infer x4, [infer x3, [infer x2, [infer x1, [infer x0, infer _]]]]]]] ? [x0, x1, x2, x3, x4, x5, x6, null, null, null] : never
  : K extends "8" ? B extends [infer x7, [infer x6, [infer x5, [infer x4, [infer x3, [infer x2, [infer x1, [infer x0, infer _]]]]]]]] ? [x0, x1, x2, x3, x4, x5, x6, x7, null, null] : never
  : K extends "9" ? B extends [infer x8, [infer x7, [infer x6, [infer x5, [infer x4, [infer x3, [infer x2, [infer x1, [infer x0, infer _]]]]]]]]] ? [x0, x1, x2, x3, x4, x5, x6, x7, x8, null] : never
  : K extends "10" ? B extends [infer x9, [infer x8, [infer x7, [infer x6, [infer x5, [infer x4, [infer x3, [infer x2, [infer x1, [infer x0, infer _]]]]]]]]]] ? [x0, x1, x2, x3, x4, x5, x6, x7, x8, x9] : never
  : N10;
// adds cell X
type Push<S, X> =
  S extends [infer C extends string, infer b0, infer b1, infer b2, infer b3, infer b4, infer b5, infer b6, infer b7]
    ? IncR<C> extends infer CN ? C extends `9${infer C1}`
      ? NodeOf<[[X], b0], "10"> extends infer n0 ? C1 extends `9${infer C2}`
        ? NodeOf<[n0, b1], "10"> extends infer n1 ? C2 extends `9${infer C3}`
          ? NodeOf<[n1, b2], "10"> extends infer n2 ? C3 extends `9${infer C4}`
            ? NodeOf<[n2, b3], "10"> extends infer n3 ? C4 extends `9${infer C5}`
              ? NodeOf<[n3, b4], "10"> extends infer n4 ? C5 extends `9${infer C6}`
                ? NodeOf<[n4, b5], "10"> extends infer n5 ? C6 extends `9${infer C7}`
                  ? NodeOf<[n5, b6], "10"> extends infer n6 ? [CN, null, null, null, null, null, null, null, [n6, b7]] : never
                  : [CN, null, null, null, null, null, null, [n5, b6], b7] : never
                : [CN, null, null, null, null, null, [n4, b5], b6, b7] : never
              : [CN, null, null, null, null, [n3, b4], b5, b6, b7] : never
            : [CN, null, null, null, [n2, b3], b4, b5, b6, b7] : never
          : [CN, null, null, [n1, b2], b3, b4, b5, b6, b7] : never
        : [CN, null, [n0, b1], b2, b3, b4, b5, b6, b7] : never
      : [CN, [[X], b0], b1, b2, b3, b4, b5, b6, b7]
    : never : never;
// [the trie, the address of the next cell]
type Finish<S> =
  S extends [infer C extends string, infer b0, infer b1, infer b2, infer b3, infer b4, infer b5, infer b6, infer b7]
    ? C extends `${infer d0}${infer d1}${infer d2}${infer d3}${infer d4}${infer d5}${infer d6}${infer d7}`
      ? NodeOf<b0, d0> extends infer n0 ? NodeOf<[n0, b1], Succ10[d1 & keyof Succ10]> extends infer n1 ? NodeOf<[n1, b2], Succ10[d2 & keyof Succ10]> extends infer n2 ? NodeOf<[n2, b3], Succ10[d3 & keyof Succ10]> extends infer n3 ? NodeOf<[n3, b4], Succ10[d4 & keyof Succ10]> extends infer n4 ? NodeOf<[n4, b5], Succ10[d5 & keyof Succ10]> extends infer n5 ? NodeOf<[n5, b6], Succ10[d6 & keyof Succ10]> extends infer n6 ? NodeOf<[n6, b7], Succ10[d7 & keyof Succ10]> extends infer n7 ?
        [n7, Big<StripZ<`${d7}${d6}${d5}${d4}${d3}${d2}${d1}${d0}`>>]
        : never : never : never : never : never : never : never : never
      : never
    : never;
type BuildRuns<S, Runs extends unknown[], I extends number> =
  I extends Runs["length"] ? S
  : Runs[I] extends [infer C extends bigint, infer Pat extends unknown[]] ? BuildRuns<RepeatCells<S, Pat, Rev<Str<C>>>, Runs, Next<I>> : S;
// K (a counter) times the cells
type RepeatCells<S, Pat extends unknown[], K extends string> =
  IsZeroR<K> extends true ? S : RepeatCells<PushCells<S, Pat, 0>, Pat, DecR<K>>;
type PushCells<S, Pat extends unknown[], I extends number> =
  I extends Pat["length"] ? S : PushCells<Push<S, Pat[I]>, Pat, Next<I>>;

// Count zero values: [heap, address of the first cell]
/** @native halloc */
export type halloc<H, Zero, Count> = halloc_c<H, Zero, Count extends bigint ? Count : never>;
type halloc_c<H, Zero, Count extends bigint> =
  hget<H, 0n> extends infer Top extends bigint
    ? FillN<H, Top, Count, ZeroCells<Zero>> extends [infer H2, infer End extends bigint] ? hset<H2, 0n, End> extends infer H3 ? [H3, Top] : never : never
    : never;

// the cells, freshly allocated: [heap, address]
type AllocCells<H, Cells extends unknown[]> =
  hget<H, 0n> extends infer Top extends bigint
    ? StoreCells<H, Top, Cells> extends [infer H2, infer End extends bigint] ? hset<H2, 0n, End> extends infer H3 ? [H3, Top] : never : never
    : never;

// memmove of N cells, 1024 at a time (from the end when the destination is
// above the source): tsc and tsgo refuse tuples of more than 10000 elements
// (TS2799), and 32 KB buffers are copied
/** @native hcopy */
export type hcopy<H, Dst, Src, N> = hcopy_c<H, Dst, Src, N extends bigint ? N : never>;
type hcopy_c<H, Dst, Src, N extends bigint> =
  ile<N, 0n> extends true ? H
  : igt<Dst & bigint, Src & bigint> extends true ? CopyBack<H, Dst & bigint, Src & bigint, N>
  : CopyFwd<H, Dst & bigint, Src & bigint, N>;
type CopyFwd<H, D extends bigint, S extends bigint, N extends bigint> =
  ile<N, 0n> extends true ? H
  : Min<N, 1024n> extends infer K extends bigint
    ? StoreCells<H, D, LoadN<H, S, K>> extends [infer H2, infer _] ? CopyFwd<H2, iadd<D, K>, iadd<S, K>, isub<N, K>> : never
    : never;
type CopyBack<H, D extends bigint, S extends bigint, N extends bigint> =
  ile<N, 0n> extends true ? H
  : isub<N, Min<N, 1024n>> extends infer R extends bigint
    ? StoreCells<H, iadd<D, R>, LoadN<H, iadd<S, R>, isub<N, R>>> extends [infer H2, infer _] ? CopyBack<H2, D, S, R> : never
    : never;

// ---------------------------------------------------------------------------
// layouts

type Dg = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
// leading decimal number of L: [digits, rest]
type Num<L extends string, Acc extends string = ""> =
  L extends `${infer d extends Dg}${infer R}` ? Num<R, `${Acc}${d}`> : [Acc, L];

// L without its first layout
type SkipL<L extends string> =
  L extends `s${infer R}` ? R
  : L extends `(${infer R}` ? SkipFields<R>
  : L extends `[${infer R}` ? Num<R> extends [string, infer E extends string] ? SkipL<E> extends `]${infer R2}` ? R2 : never : never
  : never;
type SkipFields<L extends string> = L extends `)${infer R}` ? R : SkipFields<SkipL<L>>;

// Layouts are walked with the address as its 8 digits (Pad8 once, Inc8 per
// cell: no decimal conversion and bigint addition per cell).
// the value with layout L at the address with digits A: [value, next digits, rest of L]
type LoadL<H, A, L extends string> =
  L extends `s${infer R}` ? HGetS<H, A> extends infer V ? [V, Inc8<A>, R] : never
  : L extends `(${infer R}`
    ? R extends `${infer F})${infer Rest}` ? AllS<F> extends true ? LoadRun<H, A, Len<SplitS<F>>, []> extends [infer V, infer A2] ? [V, A2, Rest] : never : LoadFields<H, A, R, []> : never
  : L extends `[${infer R}`
    ? Num<R> extends [infer N extends string, infer E extends string]
      ? E extends `s]${infer Rest}` ? LoadRun<H, A, Big<N>, []> extends [infer V, infer A2] ? [V, A2, Rest] : never
      : N extends `${infer C extends number}` ? LoadArr<H, A, C, E, [], 0> : never
      : never
  : never;
// A struct of scalar fields, or an array of scalars, is a run of cells
// (StoreFrom, LoadRun: a node of ten leaves at a time).
type AllS<F extends string> = F extends `s${infer R}` ? AllS<R> : F extends "" ? true : false;
type SplitS<F extends string, Acc extends unknown[] = []> = F extends `s${infer R}` ? SplitS<R, [...Acc, 0]> : Acc;
type HGetS<H, A> = H extends [infer K, infer T] ? GetK<T, K, A> extends [infer V] ? V : Panic<"load of unallocated cell"> : never;
type LoadFields<H, A, L extends string, Acc extends unknown[]> =
  L extends `)${infer R}` ? [Acc, A, R]
  : LoadL<H, A, L> extends [infer V, infer A2, infer R extends string] ? LoadFields<H, A2, R, [...Acc, V]> : never;
type LoadArr<H, A, C extends number, E extends string, Acc extends unknown[], I extends number> =
  I extends C ? SkipL<E> extends `]${infer R}` ? [Acc, A, R] : never
  : LoadL<H, A, E> extends [infer V, infer A2, infer _] ? LoadArr<H, A2, C, E, [...Acc, V], Next<I>> : never;

/** @native hloadt */
export type hloadt<H, P, L> = hloadt_c<H, P, L extends string ? L : never>;
type hloadt_c<H, P, L extends string> = [P] extends [null] ? NilErr : LoadL<H, Pad8<Str<P & bigint>>, L>[0];

// stores V with layout L at the address with digits A: [heap, next digits,
// rest of L] (cell by cell: collecting the cells first made the checkers
// resolve the members of the growing tuple of cells at every field)
type StoreL<H, A, V, L extends string> =
  L extends `s${infer R}` ? HSetS<H, A, V> extends infer H2 ? [H2, Inc8<A>, R] : never
  : L extends `(${infer R}`
    ? V extends unknown[]
      ? R extends `${infer F})${infer Rest}` ? AllS<F> extends true ? StoreFrom<H, A, V, 0> extends [infer H2, infer A2] ? [H2, A2, Rest] : never : StoreFields<H, A, V, R, 0> : never
      : never
  : L extends `[${infer R}`
    ? Num<R> extends [string, infer E extends string]
      ? V extends unknown[]
        ? E extends `s]${infer Rest}` ? StoreFrom<H, A, V, 0> extends [infer H2, infer A2] ? [H2, A2, Rest] : never
        : StoreArr<H, A, V, E, 0>
        : never
      : never
  : never;
type StoreFields<H, A, V extends unknown[], L extends string, I extends number> =
  L extends `)${infer R}` ? [H, A, R]
  : I extends V["length"] ? never
  : StoreL<H, A, V[I], L> extends [infer H2, infer A2, infer R extends string] ? StoreFields<H2, A2, V, R, Next<I>> : never;
type StoreArr<H, A, V extends unknown[], E extends string, I extends number> =
  I extends V["length"] ? SkipL<E> extends `]${infer R}` ? [H, A, R] : never
  : StoreL<H, A, V[I], E> extends [infer H2, infer A2, infer _] ? StoreArr<H2, A2, V, E, Next<I>> : never;

/** @native hstoret */
export type hstoret<H, P, V, L> = hstoret_c<H, P, V, L extends string ? L : never>;
type hstoret_c<H, P, V, L extends string> = [P] extends [null] ? NilErr : StoreL<H, Pad8<Str<P & bigint>>, V, L> extends [infer H2, ...infer _] ? H2 : never;

// arrays as values
type Repeat<N extends bigint, X, Acc extends unknown[] = []> = ile<N, 0n> extends true ? Acc : Repeat<isub<N, 1n>, X, [...Acc, X]>;
/** @native vnew */
export type vnew<N, Z> = vnew_c<N extends bigint ? N : never, Z>;
type vnew_c<N extends bigint, Z> = Repeat<N, Z>;
/** @native vget */
export type vget<V, I> = vget_c<V extends unknown[] ? V : never, I extends bigint ? I : never>;
type vget_c<V extends unknown[], I extends bigint> =
  ilt<I, 0n> extends true ? rterr<`index out of range [${I}] with length ${V["length"]}`>
  : ige<I, Len<V>> extends true ? rterr<`index out of range [${I}] with length ${V["length"]}`> : V[Ix<I>];

// ---------------------------------------------------------------------------
// slices

type Ptr<S> = S extends [infer P, unknown, unknown] ? P : null;
type SLen<S> = S extends [unknown, infer L extends bigint, unknown] ? L : 0n;
type SCap<S> = S extends [unknown, unknown, infer C extends bigint] ? C : 0n;

/** @native sdata */
export type sdata<S> = Ptr<S>;

/** @native sidx */
export type sidx<S, I, Stride> = sidx_c<S, I extends bigint ? I : never, Stride extends bigint ? Stride : never>;
type sidx_c<S, I extends bigint, Stride extends bigint> =
  ilt<I, 0n> extends true ? rterr<`index out of range [${I}] with length ${SLen<S>}`>
  : ige<I, SLen<S>> extends true ? rterr<`index out of range [${I}] with length ${SLen<S>}`>
  : iadd<Ptr<S> & bigint, imul<I, Stride>>;

// the cell of element I of slice S (of Stride cells each), and a store into
// it (hget/hset of sidx)
/** @native hgets */
export type hgets<H, S, I, Stride> = hgets_c<H, S, I extends bigint ? I : never, Stride extends bigint ? Stride : never>;
type hgets_c<H, S, I extends bigint, Stride extends bigint> =
  sidx<S, I, Stride> extends infer A ? A extends bigint ? hget<H, A> : A : never;
/** @native hsets */
export type hsets<H, S, I, Stride, V> = hsets_c<H, S, I extends bigint ? I : never, Stride extends bigint ? Stride : never, V>;
type hsets_c<H, S, I extends bigint, Stride extends bigint, V> =
  sidx<S, I, Stride> extends infer A ? A extends bigint ? hset<H, A, V> : A : never;

/** @native salloc */
export type salloc<H, N, C, Zero> = salloc_c<H, N extends bigint ? N : never, C extends bigint ? C : never, Zero>;
type salloc_c<H, N extends bigint, C extends bigint, Zero> =
  // make([]T, 0) is not nil: an empty slice points at the allocation top (no cells, like Go's zerobase)
  ieq<C, 0n> extends true ? [H, [hget<H, 0n>, 0n, 0n]]
  : halloc<H, Zero, C> extends [infer H2, infer Base] ? [H2, [Base, N, C]] : never;

type Or<X, D> = [X] extends [null] ? D : X;

/** @native reslice */
export type reslice<S, Lo, Hi, Max, Stride> = reslice_c<S, Lo, Hi, Max, Stride extends bigint ? Stride : never>;
type reslice_c<S, Lo, Hi, Max, Stride extends bigint> =
  [Or<Lo, 0n> & bigint, Or<Hi, SLen<S>> & bigint, Or<Max, SCap<S>> & bigint] extends [infer lo extends bigint, infer hi extends bigint, infer mx extends bigint]
    ? ilt<lo, 0n> extends true ? Panic<"slice bounds out of range">
    : ilt<hi, lo> extends true ? Panic<"slice bounds out of range">
    : ilt<mx, hi> extends true ? Panic<"slice bounds out of range">
    : igt<mx, SCap<S>> extends true ? Panic<"slice bounds out of range">
    : ([Ptr<S>] extends [null] ? null : iadd<Ptr<S> & bigint, imul<lo, Stride>>) extends infer p ? isub<hi, lo> extends infer l ? isub<mx, lo> extends infer c ? [p, l, c] : never : never : never
    : never;

/** @native aslice */
export type aslice<P, N, Lo, Hi, Max, Stride> = aslice_c<P, N extends bigint ? N : never, Lo, Hi, Max, Stride extends bigint ? Stride : never>;
type aslice_c<P, N extends bigint, Lo, Hi, Max, Stride extends bigint> =
  [Or<Lo, 0n> & bigint, Or<Hi, N> & bigint, Or<Max, N> & bigint] extends [infer lo extends bigint, infer hi extends bigint, infer mx extends bigint]
    ? ilt<lo, 0n> extends true ? Panic<"slice bounds out of range">
    : ilt<hi, lo> extends true ? Panic<"slice bounds out of range">
    : ilt<mx, hi> extends true ? Panic<"slice bounds out of range">
    : igt<mx, N> extends true ? Panic<"slice bounds out of range">
    : padd<P, imul<lo, Stride>> extends infer p ? isub<hi, lo> extends infer l ? isub<mx, lo> extends infer c ? [p, l, c] : never : never : never
    : never;

// size classes of the Go allocator, and roundupsize
type SizeClasses = [0n, 8n, 16n, 24n, 32n, 48n, 64n, 80n, 96n, 112n, 128n, 144n, 160n, 176n, 192n, 208n, 224n, 240n, 256n,
  288n, 320n, 352n, 384n, 416n, 448n, 480n, 512n, 576n, 640n, 704n, 768n, 896n, 1024n, 1152n, 1280n,
  1408n, 1536n, 1792n, 2048n, 2304n, 2688n, 3072n, 3200n, 3456n, 4096n, 4864n, 5376n, 6144n, 6528n,
  6784n, 6912n, 8192n, 9472n, 9728n, 10240n, 10880n, 12288n, 13568n, 14336n, 16384n, 18432n,
  19072n, 20480n, 21760n, 24576n, 27264n, 28672n, 32768n];
type FirstClass<Req extends bigint, Cs extends unknown[]> =
  Cs extends [infer c extends bigint, ...infer R] ? ige<c, Req> extends true ? c : FirstClass<Req, R> : never;
export type roundupsize<Size extends bigint, NoScan extends boolean> =
  ile<Size, 32760n> extends true
    ? (NoScan extends false ? igt<Size, 512n> extends true ? iadd<Size, 8n> : Size : Size) extends infer Req extends bigint
      ? isub<FirstClass<Req, SizeClasses>, isub<Req, Size>>
      : never
    : iadd<Size, 8191n> extends infer R extends bigint ? isub<R, iand<R, 8191n>> : never;

// runtime.nextslicecap + roundupsize
type Grow<C extends bigint, N extends bigint> =
  ilt<C, N> extends true ? Grow<iadd<C, iushr<iadd<C, 768n>, 2n>>, N> : C;
export type growcap<OldCap extends bigint, NewLen extends bigint, ElemSize extends bigint, NoScan extends boolean> =
  (igt<NewLen, iadd<OldCap, OldCap>> extends true ? NewLen
    : ilt<OldCap, 256n> extends true ? iadd<OldCap, OldCap>
    : Grow<OldCap, NewLen>) extends infer NC extends bigint
    ? ile<ElemSize, 0n> extends true ? NC : idiv<roundupsize<imul<NC, ElemSize>, NoScan>, ElemSize>
    : never;

// append(s, t...): [heap, slice]; t is a slice or (for []byte) a string
/** @native sappend */
// (the items are copied cell by cell from where they are, not collected in
// a tuple first: tsc and tsgo refuse tuples of more than 10000 elements)
export type sappend<H, S, T, Zero, Stride, ElemSize, NoScan> = sappend_c<H, S, T, Zero, Stride extends bigint ? Stride : never, ElemSize extends bigint ? ElemSize : never, NoScan extends boolean ? NoScan : never>;
type sappend_c<H, S, T, Zero, Stride extends bigint, ElemSize extends bigint, NoScan extends boolean> =
  (T extends string ? slen<T> : imul<SLen<T>, Stride>) extends infer K extends bigint
    ? ile<K, 0n> extends true ? [H, S]
    : (T extends string ? K : SLen<T>) extends infer N extends bigint
      ? iadd<SLen<S>, N> extends infer L extends bigint
        ? ile<L, SCap<S>> extends true
          ? PutItems<H, iadd<Ptr<S> & bigint, imul<SLen<S>, Stride>>, T, K> extends infer H2
            ? Ptr<S> extends infer B ? SCap<S> extends infer C ? [H2, [B, L, C]] : never : never
            : never
          : growcap<SCap<S>, L, ElemSize, NoScan> extends infer NC extends bigint
            ? halloc<H, Zero, NC> extends [infer H2, infer Base extends bigint]
              ? hcopy<H2, Base, Ptr<S>, imul<SLen<S>, Stride>> extends infer H3
                ? PutItems<H3, iadd<Base, imul<SLen<S>, Stride>>, T, K> extends infer H4 ? [H4, [Base, L, NC]] : never
                : never
              : never
            : never
        : never
      : never
    : never;
// append(s, v0, v1, ...): [heap, slice]; Items are the cells of the values
// (Stride each), not first stored somewhere to be copied from
/** @native sappendv */
export type sappendv<H, S, Items, Zero, Stride, ElemSize, NoScan> = sappendv_c<H, S, Items extends unknown[] ? Items : never, Zero, Stride extends bigint ? Stride : never, ElemSize extends bigint ? ElemSize : never, NoScan extends boolean ? NoScan : never>;
type sappendv_c<H, S, Items extends unknown[], Zero, Stride extends bigint, ElemSize extends bigint, NoScan extends boolean> =
  idiv<Big<`${Items["length"]}`>, Stride> extends infer N extends bigint
    ? iadd<SLen<S>, N> extends infer L extends bigint
      ? ile<L, SCap<S>> extends true
        ? StoreCells<H, iadd<Ptr<S> & bigint, imul<SLen<S>, Stride>>, Items> extends [infer H2, unknown]
          ? Ptr<S> extends infer B ? SCap<S> extends infer C ? [H2, [B, L, C]] : never : never
          : never
        : growcap<SCap<S>, L, ElemSize, NoScan> extends infer NC extends bigint
          ? halloc<H, Zero, NC> extends [infer H2, infer Base extends bigint]
            ? hcopy<H2, Base, Ptr<S>, imul<SLen<S>, Stride>> extends infer H3
              ? StoreCells<H3, iadd<Base, imul<SLen<S>, Stride>>, Items> extends [infer H4, unknown] ? [H4, [Base, L, NC]] : never
              : never
            : never
          : never
      : never
    : never;
// the heap with the K cells of T (a slice, or a string's bytes) at P
type PutItems<H, P extends bigint, T, K extends bigint> =
  T extends string ? StoreStr<H, P, T, K> : hcopy<H, P, Ptr<T>, K>;

type Min<A extends bigint, B extends bigint> = ilt<A, B> extends true ? A : B;

// copy(dst, src): [heap, n]; src may be a string
/** @native scopy */
export type scopy<H, Dst, Src, Stride> = scopy_c<H, Dst, Src, Stride extends bigint ? Stride : never>;
type scopy_c<H, Dst, Src, Stride extends bigint> =
  (Src extends string ? Min<slen<Src>, SLen<Dst>> : Min<SLen<Src>, SLen<Dst>>) extends infer N extends bigint
    ? ieq<N, 0n> extends true ? [H, 0n]
    : Src extends string
      ? [StoreStr<H, Ptr<Dst> & bigint, Src, N>, N]
      : [hcopy<H, Ptr<Dst>, Ptr<Src>, imul<N, Stride>>, N]
    : never;
// the heap with the first N bytes of S stored at P
type StoreStr<H, P extends bigint, S extends string, N extends bigint> = StrRun<H, Pad8<Str<P>>, S, N>;
type StrRun<H, A, S extends string, N extends bigint> =
  ile<N, 0n> extends true ? H
  : S extends "" ? H
  : H extends [infer K, infer T]
    ? Fits<A, K> extends true
      ? A extends `${infer Pre}${infer _0}${infer _1}${infer _2}${infer _3}${infer _4}${infer _5}${infer D}`
        ? PutStr<GetNode<T, K, A>, D, S, Upto10<N>> extends [infer L, infer D2 extends string, infer C extends number, infer R extends string]
          ? SetNode<T, K, A, L> extends infer T2
            ? StrRun<[K, T2], NextS<`${Pre}${_0}${_1}${_2}${_3}${_4}${_5}`, D2>, R, isub<N, Big<`${C}`>>>
            : never
          : never
        : never
      : S extends `${infer X}${infer R}` ? StrRun<HSetS<H, A, CharByte[X & keyof CharByte]>, Inc8<A>, R, isub<N, 1n>> : H
    : never;

// clear(s)
/** @native sclear */
export type sclear<H, S, Zero> = ile<SLen<S>, 0n> extends true ? H : FillN<H, Ptr<S> & bigint, SLen<S>, ZeroCells<Zero>>[0];

// swaps elements i and j
/** @native sswap */
export type sswap<H, S, I, J, Stride> = sswap_c<H, S, I extends bigint ? I : never, J extends bigint ? J : never, Stride extends bigint ? Stride : never>;
type sswap_c<H, S, I extends bigint, J extends bigint, Stride extends bigint> =
  ilt<I, 0n> extends true ? Panic<"index out of range"> : ige<I, SLen<S>> extends true ? Panic<"index out of range">
  : ilt<J, 0n> extends true ? Panic<"index out of range"> : ige<J, SLen<S>> extends true ? Panic<"index out of range">
  : [iadd<Ptr<S> & bigint, imul<I, Stride>>, iadd<Ptr<S> & bigint, imul<J, Stride>>] extends [infer PI extends bigint, infer PJ extends bigint]
    ? StoreCells<StoreCells<H, PI, LoadN<H, PJ, Stride>>[0], PJ, LoadN<H, PI, Stride>>[0]
    : never;

// the bytes in the N cells at P as a string (up to the first cell that holds no integer)
// (read a node of ten leaves at a time; a byte's character by its digits)
type CellsStr<H, P extends bigint, N extends bigint> = StrOfRun<H, Pad8<Str<P>>, N, "", false>;
type ByteStr<X extends bigint> = `${X}` extends keyof ByteChar ? ByteChar[`${X}`] : ByteChar[Str<iand<X, 255n>> & keyof ByteChar];
// the string of the N cells from the address with digits A (bytes, or runes if R)
type StrOfRun<H, A, N extends bigint, Acc extends string, R extends boolean> =
  ile<N, 0n> extends true ? Acc
  : H extends [infer K, infer T]
    ? Fits<A, K> extends true
      ? A extends `${infer Pre}${infer _0}${infer _1}${infer _2}${infer _3}${infer _4}${infer _5}${infer D}`
        ? TakeStr<GetNode<T, K, A>, D, Upto10<N>, Acc, R> extends [infer Acc2 extends string, infer D2 extends string, infer C extends number, infer Done]
          ? Done extends true ? Acc2 : StrOfRun<H, NextS<`${Pre}${_0}${_1}${_2}${_3}${_4}${_5}`, D2>, isub<N, Big<`${C}`>>, Acc2, R>
          : never
        : never
      : Cell<null> extends infer X extends bigint ? StrOfRun<H, Inc8<A>, isub<N, 1n>, `${Acc}${R extends true ? runestr<X> : ByteStr<X>}`, R> : Acc
    : never;
// Acc with the characters of at most C slots of node L from D, up to the
// first that holds no integer: [string, next slot, slots read, whether one held none]
type TakeStr<L, D extends string, C extends number, Acc extends string, R extends boolean, I extends number = 0> =
  D extends "10" ? [Acc, D, I, false]
  : I extends C ? [Acc, D, I, false]
  : Cell<At<L, D>> extends infer X extends bigint
    ? TakeStr<L, Succ10[D & keyof Succ10], C, `${Acc}${R extends true ? runestr<X> : ByteStr<X>}`, R, Next<I>>
    : [Acc, D, I, true];

/** @native bytes2s */
export type bytes2s<H, S> = ile<SLen<S>, 0n> extends true ? "" : CellsStr<H, Ptr<S> & bigint, SLen<S>>;
/** @native ptrstr */
export type ptrstr<H, P, N> = ptrstr_c<H, P, N extends bigint ? N : never>;
type ptrstr_c<H, P, N extends bigint> = ile<N, 0n> extends true ? "" : CellsStr<H, P & bigint, N>;

// []byte(s): [heap, slice]
/** @native s2bytes */
export type s2bytes<H, S> = s2bytes_c<H, S extends string ? S : never>;
type s2bytes_c<H, S extends string> =
  S extends "" ? [H, [hget<H, 0n>, 0n, 0n]]
  : slen<S> extends infer L extends bigint ? roundupsize<L, true> extends infer C extends bigint
    ? hget<H, 0n> extends infer Top extends bigint
      ? FillN<StoreStr<H, Top, S, L>, iadd<Top, L>, isub<C, L>, [0n]> extends [infer H2, infer End extends bigint]
        ? hset<H2, 0n, End> extends infer H3 ? [H3, [Top, L, C]] : never
        : never
      : never
    : never : never;

// string(runes)
type RunesStr<H, P extends bigint, N extends bigint> = StrOfRun<H, Pad8<Str<P>>, N, "", true>;
/** @native runes2sl */
export type runes2sl<H, S> = ile<SLen<S>, 0n> extends true ? "" : RunesStr<H, Ptr<S> & bigint, SLen<S>>;

// []rune(s): [heap, slice]
type Runes<S extends string, Acc extends unknown[]> =
  S extends "" ? Acc
  : decoderune<S, 0n> extends [infer R, infer W extends bigint] ? Runes<DropW<S, W>, [...Acc, R]> : never;
/** @native s2runesl */
export type s2runesl<H, S> = s2runesl_c<H, S extends string ? S : never>;
type s2runesl_c<H, S extends string> =
  Runes<S, []> extends infer Rs extends unknown[]
    ? Rs extends [] ? [H, [hget<H, 0n>, 0n, 0n]]
    : idiv<roundupsize<imul<Len<Rs>, 4n>, true>, 4n> extends infer C extends bigint
      ? AllocCells<H, [...Rs, ...Repeat<isub<C, Len<Rs>>, 0n>]> extends [infer H2, infer Base] ? [H2, [Base, Len<Rs>, C]] : never
      : never
    : never;

// range over a string: the iterator cell holds [the rest of s, its position]
// (the rest rather than s: a step then decodes at its start instead of
// skipping the position's characters)
/** @native srange */
export type srange<H, S> = srange_c<H, S extends string ? S : never>;
type srange_c<H, S extends string> = AllocCells<H, [[S, 0n]]>;
// [heap, ok, index, rune]
/** @native snext */
export type snext<H, It> =
  hget<H, It> extends [infer S extends string, infer Pos extends bigint]
    ? S extends "" ? [H, false, 0n, 0n]
    : decoderune<S, 0n> extends [infer R, infer W extends bigint] ? [hset<H, It, [DropW<S, W>, iadd<Pos, W>]>, true, Pos, R] : never
    : Panic<"snext: bad iterator">;
// S without its first W (1n to 4n) characters
type DropW<S extends string, W extends bigint> =
  S extends `${string}${infer R}` ? W extends 1n ? R : DropW<R, isub<W, 1n>> : S;

// strings.Builder: the cell after addr holds the string written so far
/** @native bstr */
export type bstr<H, P> = hget<H, padd<P, 1n>> extends infer S extends string ? S : "";
/** @native bappend */
export type bappend<H, P, S> = bappend_c<H, P, S extends string ? S : never>;
type bappend_c<H, P, S extends string> = hset<H, padd<P, 1n>, `${bstr<H, P>}${S}`>;
