import type {PetId,PetState} from './core/behavior';
export {};
declare global{
 interface Window{
  dpet?: {
   onState:(fn:(pet:PetState)=>void)=>()=>void;
   onPat:(fn:()=>void)=>()=>void;
   pat:(id:PetId)=>void;
  };
 }
}
