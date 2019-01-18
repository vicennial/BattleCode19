const nav = {};

nav.compass = [
    ['NW', 'N', 'NE'],
    ['W', 'C', 'E'],
    ['SW', 'S', 'SE'],
];

nav.rotateArr = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
nav.rotateArrInd = {
    'N': 0,
    'NE': 1,
    'E': 2,    
    'SE': 3,
    'S': 4,
    'SW': 5,
    'W': 6,
    'NW': 7,
};

nav.compassToCoordinate = {
    'N': {x: 0, y: -1},
    'NE': {x: 1, y: -1},
    'NW': {x: -1, y: -1},
    'E': {x: 1, y: 0},
    'W': {x: -1, y: 0},
    'S': {x: 0, y: 1},
    'SE': {x: 1, y: 1},
    'SW': {x: -1, y: 1},
};

nav.toCompassDir = (dir) => {
    return nav.compass[dir.y + 1][dir.x + 1];
};

nav.toCoordinateDir = (dir) => {
    return nav.compassToCoordinate[dir];
};

nav.rotate = (dir, amount) => {
    const compassDir = nav.toCompassDir(dir);
    const rotateCompassDir = nav.rotateArr[(nav.rotateArrInd[compassDir] + amount) % 8];
    return nav.toCoordinateDir(rotateCompassDir);
};

nav.reflect = (loc, fullMap, isHorizontalReflection) => {
    const mapLen = fullMap.length;
    const hReflect = {
        x: loc.x,
        y: mapLen - loc.y,
    };
    const vReflect = {
        x: mapLen - loc.y,
        y: loc.y,
    };

    if (isHorizontalReflection) {
        return fullMap[hReflect.y][hReflect.x] ? hReflect : vReflect;
    } else {
        return fullMap[vReflect.y][vReflect.x] ? vReflect : hReflect;
    }
};

nav.getDir = (start, target) => {
    const newDir = {
        x: target.x - start.x,
        y: target.y - start.y,
    };

    // if (newDir.x < 0) {
    //     newDir.x = -1;
    // } else if (newDir.x > 0) {
    //     newDir.x = 1;
    // }

    // if (newDir.y < 0) {
    //     newDir.y = -1;
    // } else if (newDir.y > 0) {
    //     newDir.y = 1;
    // }

    return newDir;
};

nav.isPassable = (loc, fullMap, robotMap) => {
    const {x, y} = loc;
    const mapLen = fullMap.length;
    if (x >= mapLen || x < 0) {
        return false;
    } else if (y >= mapLen || y < 0) {
        return false;
    } else if (robotMap[y][x] >0 ||  !fullMap[y][x]) {
        return false;
    } else {
        return true;
    }
};

nav.applyDir = (loc, dir) => {
    return {
        x: loc.x + dir.x,
        y: loc.y + dir.y,
    };
};

function create2DArray(numRows, numColumns) {
    let array = new Array(numRows);

    for (let i = 0; i < numColumns; i++) {
        array[i] = new Array(numColumns);
    }
    for (let i = 0; i < numColumns; i++) {
        for(let j=0; j<numRows; j++){
            array[i][j]=0;
        }
    }
    return array;
}
nav.bfsdir = (loc, destination, fullMap, robotMap, radius) => {
    const mapLen= fullMap.length;
    var queue = [];
    queue.pop = queue.shift;
    let visited = create2DArray(mapLen,mapLen);
    queue.push(destination);
    visited[destination.x][destination.y] = true;
    // let message= "ERROR BOOIII:\n" + "TARGET: "+ loc.x +" " +loc.y + "\n";
    // message+= destination.x + " " + destination.y +"\n";
    // throw message;
    while(queue.length){
        // throw "ql"+queue.length;
        let node = queue.shift();
        for(let i = -3; i <= 3; i++){
            for(let j = -3 ; j <= 3; j++){
                // throw node.x;
                let a = node.x + i;
                let b = node.y + j;
                if(i*i + j*j > radius) continue;
                let pos={
                    x: a,
                    y: b,
                };
                if( b== loc.y && a==loc.x){
                    let current={
                        x: node.x,
                        y: node.y,
                    };  
                    // this.log("inside bfsdir:"+node.x+" "+node.y);
                    // throw "inside bfsdir:" + node.x + " " + node.y;
                    return current;
                        
                }
                if (a >= mapLen || a < 0 || b >= mapLen || b < 0 || robotMap[b][a] > 0 || !fullMap[b][a] || visited[a][b]){
                    continue;
                }
                // message+=a + " " + b +"\n";
                queue.push(pos);
                visited[a][b] = 1;
            }
        }
        
    }
    // throw new Error();
    const temp = {
        x: -1,
        y: -1,
    };
    return temp;
}
nav.goto = (loc, destination, fullMap, robotMap, radius) => {
    // throw robotMap[0][0];
    let goalDir = nav.getDir(loc, destination);
    if (goalDir.x === 0 && goalDir.y === 0) {
        return goalDir;
    }
    let nextloc = nav.bfsdir(loc,destination,fullMap,robotMap,radius);
    // throw "Position:" + loc.x + " " + loc.y +"\n" +"Nextloc:" + nextloc.x + " " +nextloc.y + "\n";
    if(nextloc.x===-1){
        goalDir = nav.getDir(loc, destination);
        let tryDir = 0;
        while (!nav.isPassable(nav.applyDir(loc, goalDir), fullMap, robotMap) && tryDir < 8) {
            goalDir = nav.rotate(goalDir, 1);
            tryDir++;
        }
        return goalDir;
    }
    return nav.getDir(loc,nextloc,fullMap,robotMap);
};
// nav.goto = (loc, destination, fullMap, robotMap) => {
//     let goalDir = nav.getDir(loc, destination);
//     if (goalDir.x === 0 && goalDir.y === 0) {
//         return goalDir;
//     }
//     let tryDir = 0;
//     while (!nav.isPassable(nav.applyDir(loc, goalDir), fullMap, robotMap) && tryDir < 8) {
//         goalDir = nav.rotate(goalDir, 1);
//         tryDir++;
//     }
//     return goalDir;
// };
nav.sqDist = (start, end) => {
    // throw "BOIIIIII :"+ start +" "+end;
    return Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2);
    // throw "asdfs";
};

// nav.getClosestKarbonite = (loc, karbMap) => {
//     const mapLen = karbMap.length;
//     let closestLoc = null;
//     let closestDist = 100000; // Large number;
//     for (let y = 0; y < mapLen; y++) {
//         for (let x = 0; x < mapLen; x++) {
//             if (karbMap[y][x] && nav.sqDist({x,y}, loc) < closestDist) {
//                 closestDist = nav.sqDist({x,y}, loc);
//                 closestLoc = {x,y};
//             }
//         }
//     }
//     return closestLoc;
// };

nav.getRandomResourceCoordinates = (resourceList) =>{

    const randnum = Math.floor(Math.random() * resourceList.length);
    // throw "Random val" +randnum + "Length:" +arr.length +" " + arr[randnum].x + " " +arr[randnum].y;
    let x=resourceList[randnum][0];
    let y=resourceList[randnum][1];
    let destination = {x,y};
    // throw "asdadssa:"+destination.x +" "+ destination.y;
    return destination;        
}
export default nav;

