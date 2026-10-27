// Floats in plain TypeScript: a float is the bigint of its IEEE 754 binary64
// bits (float32 values are kept widened to float64). The arithmetic is Go's
// software floating point, compiled by go2types (softfloat.ts).
import type * as sf from "./softfloat";

/** @native fadd */
export type fadd<A, B> = sf.Fadd<A, B>;
/** @native fsub */
export type fsub<A, B> = sf.Fsub<A, B>;
/** @native fmul */
export type fmul<A, B> = sf.Fmul<A, B>;
/** @native fdiv */
export type fdiv<A, B> = sf.Fdiv<A, B>;
/** @native fneg */
export type fneg<A> = sf.Fneg<A>;
/** @native feq */
export type feq<A, B> = sf.Feq<A, B>;
/** @native fne */
export type fne<A, B> = sf.Fne<A, B>;
/** @native flt */
export type flt<A, B> = sf.Flt<A, B>;
/** @native fle */
export type fle<A, B> = sf.Fle<A, B>;
/** @native i2f */
export type i2f<A> = sf.I2f<A>;
/** @native u2f */
export type u2f<A> = sf.U2f<A>;
/** @native f2i */
export type f2i<A> = sf.F2i<A>;
/** @native f2u */
export type f2u<A> = sf.F2u<A>;
/** @native fround32 */
export type fround32<A> = sf.Fround32<A>;
/** @native f32bits */
export type f32bits<A> = sf.F32bits<A>;
/** @native bits2f32 */
export type bits2f32<A> = sf.Bits2f32<A>;
/** @native isnan */
export type isnan<A> = sf.Isnan<A>;
/** @native ffloor */
export type ffloor<A> = sf.Ffloor<A>;
/** @native fsqrt */
export type fsqrt<A> = sf.Fsqrt<A>;
/** @native ftoa */
export type ftoa<A> = sf.Ftoa<A>;
/** @native f2bits */
export type f2bits<A> = A;
/** @native bits2f */
export type bits2f<A> = A;
