/** Pure work-area geometry, shared with tests and future platform adapters. */
export interface WorkArea {x:number;y:number;width:number;height:number;}
export interface PetBounds {x:number;y:number;width:number;height:number;}
export function petBounds(workArea:WorkArea,desiredSize:number,floorOffset:number,relativeX:number):PetBounds{
  const width=Math.max(1,Math.min(Math.round(desiredSize),Math.max(1,workArea.width)));
  const height=Math.max(1,Math.min(Math.round(desiredSize),Math.max(1,workArea.height)));
  const maxX=Math.max(0,workArea.width-width);
  const safeX=Math.min(Math.max(Number.isFinite(relativeX)?relativeX:0,0),maxX);
  const margin=Math.min(Math.max(floorOffset,0),Math.max(0,workArea.height-height));
  return {
    x:workArea.x+Math.round(safeX),
    y:workArea.y+workArea.height-height-margin,
    width,height
  };
}
