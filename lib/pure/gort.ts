// Hand-written type-level runtime support for programs compiled from Go.
// H is the heap (cells); pointers are cell indices (bigint) or null; slices are
// [ptr | null, len, cap]; maps are pointers to a cell holding a native map;
// interfaces are [typeId, value] | null.
import type { hget, hset, scat, ilt, flt, slt } from "./go";

// Cell 1 holds the program's standard output, cell 2 its input.
export type gprint<H, S> = hset<H, 1n, scat<hget<H, 1n>, S>>;
export type ginput<H> = hget<H, 2n>;

// Maps (mlen_, mlookup, mlookup2, mupdate, mdelete), nil checks (nilchk) and
// type assertions on interface values [typeId, value] (ta1, ta2) are natives
// in go.ts.

export type imin<A, B> = ilt<B, A> extends true ? B : A;
export type imax<A, B> = ilt<A, B> extends true ? B : A;
export type fmin<A, B> = flt<B, A> extends true ? B : A;
export type fmax<A, B> = flt<A, B> extends true ? B : A;
export type smin<A, B> = slt<B, A> extends true ? B : A;
export type smax<A, B> = slt<A, B> extends true ? B : A;
