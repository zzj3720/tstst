// The runtime of programs compiled from Go by go2types, in plain TypeScript:
// the same names as ../go.ts, with real definitions.
export type {
  iadd, isub, imul, idiv, irem, iand, ior, ixor, iandnot, ishl, ishr, iushr, ineg, inot,
  ieq, ine, ilt, ile, igt, ige, iult, iule, iugt, iuge, iwrap, udiv, urem, itoa, uitoa,
} from "./int";
export type {
  slen, sat, sslice, scat, seq, scmp, slt, runestr, decoderune, sindexbyte, sindex, scountbyte, bytestr,
} from "./str";
export type {
  hget, hset, hgetf, hsetf, hgets, hsets, halloc, hinit, hcopy, hloadt, hstoret, padd, vnew, vget, sdata, sidx, salloc, reslice, aslice,
  sappend, sappendv, scopy, sclear, sswap, bytes2s, ptrstr, s2bytes, runes2sl, s2runesl, srange, snext, bstr, bappend,
} from "./heap";
export type { mnew, mlookup, mlookup2, mlen_, mupdate, mdelete, mrange, mnext, hstorekeys } from "./map";
export type {
  fadd, fsub, fmul, fdiv, fneg, feq, fne, flt, fle, i2f, u2f, f2i, f2u, fround32, f32bits, bits2f32,
  isnan, ffloor, fsqrt, ftoa, f2bits, bits2f,
} from "./float";
export type {
  tget, tset, geq, gne, bnot, nilchk, ta1, ta2, panic, gpanic, gunwind, grecover, gtrace, shash64, shash128,
  gfork, gwait, gexit, gcrashtag, gnowms, ggo, gpark, gwake, gyield, gidle,
} from "./misc";
export type { rterr, rtok, rtmsg } from "./rterr";
import type { hget, hset } from "./heap";
// emitted output is program output (cell 1)
/** @native write_out */
export type gemit<H, S> = gemit_c<H, S extends string ? S : never>;
type gemit_c<H, S extends string> = hset<H, 1n, `${hget<H, 1n>}${S}`>;
