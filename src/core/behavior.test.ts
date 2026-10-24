import {expect,it,describe} from 'vitest';
import {DEFAULT_SETTINGS,initialPet,advancePet,petCat,spawnX,sanitizeSettings,greetNearby,triggerActivity} from './behavior';
describe('two independent pets',()=>{
  it('starts at predictable placements',()=>{expect(initialPet('liam',400,'left').x).toBeLessThan(initialPet('liam',400,'right').x);});
  it('keeps both cats inside screen and turns at edges',()=>{
    const a={...initialPet('liam',300),x:299,direction:1 as const};
    const b=advancePet(a,250,300,()=>.4);
    expect(b.x).toBe(300);expect(b.direction).toBe(-1);expect(b.activity).toBe('look');
  });
  it('avoids giant steps after resume',()=>{
    const a=initialPet('liam',400);expect(advancePet(a,60000,400).x-a.x).toBeLessThan(12);
  });
  it('supports different speed personalities',()=>{
    const a=initialPet('liam',700);const b={...initialPet('ninoosh',700),direction:1 as const};
    expect(advancePet(a,200,700).x-a.x).toBeGreaterThan(advancePet(b,200,700).x-b.x);
  });
  it('responds to affection and supports named activities',()=>{
    const a=initialPet('ninoosh',400);expect(petCat(a).activity).toBe('happy');
    expect(a.affection).toBe(0);expect(triggerActivity(a,'groom').activity).toBe('groom');
  });
  it('greeting does not mutate state',()=>{
    const a={...initialPet('liam',400),x:100,direction:1 as const};
    const b={...initialPet('ninoosh',400),x:110,direction:-1 as const};
    expect(greetNearby(a,b).map(x=>x.activity)).toEqual(['look','look']);
    expect(a.activity).toBe('walk');
  });
  it('recovers safely from bad saved settings',()=>{
    const x=sanitizeSettings({size:999,enabled:{ninoosh:false},floorOffset:999});
    expect(x.size).toBe(DEFAULT_SETTINGS.size);
    expect(x.enabled).toEqual({liam:true,ninoosh:false,ozy:true,slash:true});
    expect(x.floorOffset).toBe(DEFAULT_SETTINGS.floorOffset);
  });
});
