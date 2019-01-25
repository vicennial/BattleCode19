'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":200,"VISION_RADIUS":100,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,64],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":0,"ATTACK_RADIUS":0,"ATTACK_FUEL_COST":0,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":15,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":49,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        t.signal = this._bc_signal;
        t.signal_radius = this._bc_signal_radius;
        t.logs = this._bc_logs;
        t.castle_talk = this._bc_castle_talk;

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.
        
        var fuelNeeded = Math.ceil(Math.sqrt(radius));
        if (this.fuel < fuelNeeded) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= fuelNeeded;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit === SPECS.CHURCH) throw "Churches cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('unit' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

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
    // if(robotMap[destination.y][destination.x] > 0) return {x:-1,y:-1};
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
                    // 
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
};
nav.goto = (loc, destination, fullMap, robotMap, radius) => {
    // throw robotMap[0][0];
    let goalDir = nav.getDir(loc, destination);
    if (goalDir.x === 0 && goalDir.y === 0) {
        return goalDir;
    }
    let nextloc = nav.bfsdir(loc,destination,fullMap,robotMap,radius);
    // throw "Position:" + loc.x + " " + loc.y +"\n" +"Nextloc:" + nextloc.x + " " +nextloc.y + "\n";
    if(nextloc.x===-1){
        // while (!nav.isPassable(nav.applyDir(loc, goalDir), fullMap, robotMap) && tryDir < 8) {
        //     goalDir = nav.rotate(goalDir, 1);
        //     tryDir++;
        // }
        let current = {
            x: loc.x,
            y: loc.y,
            nopath: 1
        };
        const mapLen = fullMap.length;

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                // throw node.x;
                let a = loc.x + i;
                let b = loc.y + j;
                if (i * i + j * j > radius) continue;
                if (a >= mapLen || a < 0 || b >= mapLen || b < 0 || robotMap[b][a] > 0 || !fullMap[b][a]) {
                    continue;
                }
                current.x=i;
                current.y=j;
                break;
            }
        }    
        return current;
    }
    let temp = nav.getDir(loc,nextloc,fullMap,robotMap);
    let current = {
        x: temp.x,
        y: temp.y,  
        nopath: 0
    };
    return current;
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
};
let fuelthreshold = 100, karbonitethreshold = 0;
nav.getClosestResourceCoordinate = (loc,visiblerobots,resourceList,fuel,karbonite,step) =>{
        let currentFuel={
            x:500,
            y:500
        };
        let currentKarbonite = {
            x: 500,
            y: 500
        };   
        let len = resourceList.length;
        for(let i =0;i<len;i++){
            let temp={
                x:resourceList[i][0],
                y:resourceList[i][1]
            };
            if(visiblerobots[temp.y][temp.x]>0) continue;
            if(resourceList[i][2] && nav.sqDist(loc,temp)<nav.sqDist(loc,currentKarbonite)){
                currentKarbonite = temp;  
            } 
            if (!resourceList[i][2] && nav.sqDist(loc, temp) < nav.sqDist(loc, currentFuel)) {
                currentFuel = temp;
            } 
        }
        var current;
        let probFuel=1;
        if(fuel > fuelthreshold){
            if(karbonite < karbonitethreshold){
                probFuel=0.2;
            }
            else{
                probFuel=0.5;                if(step>150 || nav.sqDist(loc,currentFuel)<nav.sqDist(loc,currentKarbonite)) probFuel=0.8;
                else probFuel=0.2;  

            }
        }
        else{
            probFuel=0.8;        }
        const randval=Math.random();
        if(randval<probFuel){
            current=currentFuel;
        }
        else current=currentKarbonite;
        return current;
};
nav.getClosestResourceCoordinateWithRandom = (loc, enemyResourceList) => {
    let arr =[];
    let len = enemyResourceList.length;
    for (let i = 0; i < len; i++) {
        let temp = {
            x: enemyResourceList[i][0],
            y: enemyResourceList[i][1]
        };
        arr.push(temp);
        // if (nav.sqDist(loc, temp) < nav.sqDist(loc, current)) current = temp;
    }
    arr.sort(function(x,y){
        let distx = nav.sqDist(loc,x), disty=nav.sqDist(loc,y);
        if(distx < disty){
            return -1;
        } 
        if(distx > disty){
            return 1;
        }
        return 0;
    });
    let choices = Math.min(10, len);
    const randnum = Math.floor(Math.random() * choices);
    // throw "My position: "+loc.x+" "+loc.y+"\n this arr:"+arr[randnum].x+" "+arr[randnum].y +"\n";
    return arr[randnum];
};

let step = -1;

// eslint-disable-next-line no-unused-vars
class MyRobot extends BCAbstractRobot {
    constructor() {
        super();
        this.pendingRecievedMessages = {};
        this.enemyCastles = [];
        // 
        this.buildBotProbability = [0.5, 0.5, 0.0, 0.0];
        this.availableBuildLocations = [];

        this.mapSymmetryType = -1; // 1 -> horizontal symmetry (X), 2 -> vertical (Y)
        this.resourceCoordinateList = []; // [[x, y, type = 0 if fuel, 1 if karbonite]....]
        this.whichSide = -1;

        this.myEnemyCastle = []; // X, Y
        this.attackStatusFlag = -1;
        this.random_move = [0, 0];
        this.isAttackType = -1;

        this.assignedLoc = [];
        this.atAssignedLoc = 0;
        this.enemyResourceCoordinateList = [];
        this.targetAttack = {x: -1, y: -1};
        this.ttl = 0;

        this.waitOneTurn = 1;
        this.castleWait = 4;
        this.returning=0;

        this.attacktrigger = -1;
        this.step = -1;

        this.waitedEnough = 0;
        this.signalAttack = 0;

        this.hasProbUpdate = 0;
    }
    log(msg){
        
    }
    decode(msg) {
        let decodedMsg = {
            code: null,
            x: -1,
            y: -1,
        };
        if (msg & 1) { //attack
            decodedMsg.code = msg & 14;
            decodedMsg.x = (msg >> 4) & 63;
            decodedMsg.y = (msg >> (4 + 6)) & 63;
        }
        else { // remaining
            decodedMsg.code = msg;
        }
        return decodedMsg;
    }

    encodeMessage(opcode, x = -1, y = -1) {
        var msg = opcode << 1;
        if (x != -1 && y != -1) {
            msg |= 1;
            msg |= (x << 4);
            msg |= (y << 10);
        }
        return msg
    }
    sendMessage(msg, radius) {
        if (radius == 0) { //castle
            this.castle_talk(msg);
        }
        else {
            radius = this.map.length * this.map.length;
            this.signal(msg, 4093);
        }
    }

    setMyAttackCoordinate() {
        let signal = -100;
        let sensed = this.getVisibleRobots();
        let commander = 100000;
        for (let i = 0; i < sensed.length; ++i) {
            let r = sensed[i];
            // if ((this.mapSymmetryType == 1 && this.whichSide == (r.x >= this.map.length/2))||(this.mapSymmetryType == 2 && this.whichSide == (r.y >= this.map.length/2))) {
                // 
            if (this.isRadioing(r) && r.signal_radius == 4093){
                if(commander > r.id && this.isRadioing(r)){
                    commander = r.id;
                    signal = r.signal;
                    
                }
                
                // break;
            }
        }
        if (signal != -100) {
            this.targetAttack = this.decode(signal);
        }
    }

    getMyVisibleHomieBots() {
        // 
        var sensed = this.getVisibleRobots();
        var visible = sensed.filter((r) => {
            if (r.team != this.me.team) {
                return false;
            }
            if (nav.sqDist(r, this.me) <= SPECS['UNITS'][this.me.unit]['VISION_RADIUS']) {
                return true;
            }
            return false;
        });
        return visible;
    }    
    

    nextValidLoc(){
        let len_x = this.map.length;
        let len_y = len_x;
        let mnm = 10000, mnx = 10000, mny = 10000;
        let botMap = this.getVisibleRobotMap();
        
        for(let i = 0; i < len_y; ++i){
            for(let j = 0; j < len_x; ++j){
                if(i%2 != j%2){
                    continue;
                }
                if(this.map[i][j] == true && botMap[i][j] == false && this.fuel_map[i][j] == false && this.karbonite_map[i][j] == false){
                    let dis = (this.me.x - j) ** 2 + (this.me.y - i) ** 2;
                    if(dis < mnm){
                        mnm = dis;
                        mnx = j;
                        mny = i;
                    }
                }
            }
        }
        this.assignedLoc = [mnx, mny];
    }

    getAdjacentEmpty(loc){
        let robotMap=this.getVisibleRobotMap();
        let fullMap=this.map;
        let mapLen=this.map.length;
        for (let i = -1; i <= 1; ++i) {
            for (let j = -1; j <= 1; ++j) {
                if (i === 0 && j === 0) {
                    continue;
                }
                let a=loc.x+i;
                let b=loc.y+j;
                if (a >= mapLen || a < 0 || b >= mapLen || b < 0 || robotMap[b][a] > 0 || !fullMap[b][a]) continue;
                    // availablePassableNeighbours.push([loc_x + i, loc_y + j])
                    let pos={
                        x:loc.x+i,
                        y:loc.y+j,
                    };
                    return pos; 
            }
        }
        return nav.getClosestResourceCoordinate(loc,this.resourceCoordinateList,this.fuel,this.karbonite);
    }
    getAdjacentEmptyNotOnResource(loc) {
        let robotMap = this.getVisibleRobotMap();
        let fullMap = this.map;
        let mapLen = this.map.length;
        for (let i = -1; i <= 1; ++i) {
            for (let j = -1; j <= 1; ++j) {
                if (i === 0 && j === 0) {
                    continue;
                }
                let a = loc.x + i;
                let b = loc.y + j;
                if (a >= mapLen || a < 0 || b >= mapLen || b < 0 || robotMap[b][a] > 0 || !fullMap[b][a] || this.fuel_map[b][a] || this.karbonite_map[b][a]) continue;
                // availablePassableNeighbours.push([loc_x + i, loc_y + j])
                let pos = {
                    x: loc.x + i,
                    y: loc.y + j
                };
                return pos;
            }
        }
        let pos = {
            x: -1,
            y: -1
        };        
        return pos;
    }    
    getMyResourceCoordinateList(){
        if(this.resourceCoordinateList.length > 0){
            return
        }
        
        if(this.mapSymmetryType === -1){
            this.getMapSymmetry();
        }
        if(this.mapSymmetryType == 1){
            if(this.me.x < this.map.length/2){
                this.whichSide = 0;
            }
            else{
                this.whichSide = 1;
            }
        }
        else{
            if(this.me.y < this.map.length/2){
                this.whichSide = 0;
            }
            else{
                this.whichSide = 1;
            }
        }
        
        if(this.mapSymmetryType === 1){
            // symmetry along x
            // identify which side our territory is
            var offset = 0;
            var len_y = this.map.length;
            var len_x = this.map.length;
            if(this.me.x > Math.floor(len_x/2)){
                offset = Math.floor(len_x/2);
            }
            for(let cy = 0; cy < len_y; ++cy){
                for(let cx = offset; cx < offset+Math.floor(len_x/2); ++cx){
                    if(this.fuel_map[cy][cx] == true){
                        this.resourceCoordinateList.push([cx, cy, 0]);
                    }
                    if(this.karbonite_map[cy][cx] == true){
                        this.resourceCoordinateList.push([cx, cy, 1]);
                    }
                }
            }
            offset = Math.floor(len_x/2);
            if(this.me.x > Math.floor(len_x/2)){
                offset = 0;
            }
            for (let cy = 0; cy < len_y; ++cy) {
                for (let cx = offset; cx < offset + Math.floor(len_x/2); ++cx) {
                    if (this.fuel_map[cy][cx] == true) {
                        this.enemyResourceCoordinateList.push([cx, cy, 0]);
                    }
                    if (this.karbonite_map[cy][cx] == true) {
                        this.enemyResourceCoordinateList.push([cx, cy, 1]);
                    }
                }
            }            
        }
        else{
            // symmetry along y
            // identify which side our territory is
            var offset = 0;
            var len_y = this.map.length;
            var len_x = this.map.length;
            if(this.me.y > Math.floor(len_y/2)){
                offset = Math.floor(len_y/2);
            }
            for(let cy = offset; cy < offset+Math.floor(len_y/2) && cy<len_y; ++cy){
                for(let cx = 0; cx < len_x; ++cx){
                    if(this.fuel_map[cy][cx] === true){
                        this.resourceCoordinateList.push([cx, cy, 0]);
                    }
                    if(this.karbonite_map[cy][cx] === true){
                        this.resourceCoordinateList.push([cx, cy, 1]);
                    }
                }
            }
            offset = Math.floor(len_y/2);
            if(this.me.y > Math.floor(len_y/2)){
                offset = 0;
            }
            for (let cy = offset; cy < offset + Math.floor(len_y/2) && cy < len_y; ++cy) {
                for (let cx = 0; cx < len_x; ++cx) {
                    if (this.fuel_map[cy][cx] === true) {
                        this.enemyResourceCoordinateList.push([cx, cy, 0]);
                    }
                    if (this.karbonite_map[cy][cx] === true) {
                        this.enemyResourceCoordinateList.push([cx, cy, 1]);
                    }
                }
            }            
        }
    }

    getMapSymmetry(){
        
        const len_y = this.map.length;
        const len_x = this.map.length;
        
        // check for symmetry along x axis
        for(let cy = 0; cy < len_y; ++cy){
            for(let cx = 0; cx < len_x; ++cx){
                if(this.map[cy][cx] !== this.map[cy][len_x-1-cx]){
                    this.mapSymmetryType = 2;
                    // if not symmetric in x, it must be in y
                }
            }
        }
        if(this.mapSymmetryType === -1){
            this.mapSymmetryType = 1;
            // if symmetric in x, then set accordingly
        }
    }

    updateBuildProbability() {
        // do something with buildBotProbability

    }
    attackIfVisible(){
        // see if something can be attacked from current location
        var visible = this.getVisibleRobots();
        var self = this;
        var attackable = visible.filter((r) => {
            if (!self.isVisible(r)) {
                return false;
            }
            const dist = (r.x - self.me.x) ** 2 + (r.y - self.me.y) ** 2;
            if (r.team !== self.me.team
                && SPECS.UNITS[this.me.unit].ATTACK_RADIUS[0] <= dist
                && dist <= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[1]) {
                return true;
            }
            return false;
        });

        
        let val = -1;
        if (attackable.length > 0) {
            
            // attack first robot
            var r = attackable[0],dist=nav.sqDist(this.me,r);
            for( let i =0; i<attackable.length; i++){
                if(nav.sqDist(this.me,attackable[i])<dist){
                    r=attackable[i];
                    dist=nav.sqDist(this.me,attackable[i]);
                }
            }
            
            // throw new Error();
            
            val = this.attack(r.x - this.me.x, r.y - this.me.y);
        }
        return val;
    }
    attack1(){
        
        var target_x = this.targetAttack.x;
        var target_y = this.targetAttack.y;

        let canAttack = this.attackIfVisible();
        if(canAttack !== -1){
            return canAttack;
        }
        let destination = { x: target_x, y: target_y, };
        if (target_x == -1 || target_y == -1) {
            return;
        }

        
        
        const choice = nav.goto(
            this.me,
            destination,
            this.map,
            // this.getPassableMap(),
            this.getVisibleRobotMap(),
            SPECS["UNITS"][this.me.unit]["SPEED"]);
        
        if(choice.nopath == 1){
            this.ttl++;
        }
        else{
            this.ttl = 0;
        }
        if(this.ttl >= 5){
            choice.x = 0;
            choice.y = 0;
        }
        return this.move(choice.x, choice.y)
    }
    
    
    
    
    
    turn() {
        this.step++;
        
        if(this.me.unit == SPECS.CASTLE){
            if(step > 20 && this.hasProbUpdate == 0){
                this.hasProbUpdate = 1;
                this.buildBotProbability = [0.05,0.25,0.3,0.4];
            }



            let canAttack = this.attackIfVisible();
            if (canAttack !== -1) {
                
                // throw new Error();
                return canAttack;
            }
            if(this.myEnemyCastle.length > 0 && this.attacktrigger != -1){
                let target = { x: this.myEnemyCastle[0], y: this.myEnemyCastle[1] };
                if (this.step % this.attacktrigger == 0) {
                    this.signalAttack = 1;
                    
                }
                if(this.signalAttack == 1 && this.fuel >= this.map.length){
                    this.signalAttack = 0;
                    
                    // let sendAttack = this.encodeMessage(0, target.x, target.y)
                    let sendAttack = this.encodeMessage(0, target.x, target.y);
                    this.sendMessage(sendAttack, 64);
                }
            }
            

            if(this.step > 0);
            if(this.castleWait > 0){
                this.castleWait--;
            }
            else{
                if(this.karbonite < 50 && this.waitOneTurn == 1 && this.waitedEnough < 10){
                    this.waitedEnough++;
                    return;
                }
                
                if(this.waitOneTurn){
                    this.waitOneTurn = 0;
                    return;
                }
                this.waitedEnough = 0;
                this.waitOneTurn = 1;
                this.castleWait = 4;
            }
        }

        if(this.me.unit != SPECS.CHURCH && this.me.unit != SPECS.CASTLE && this.me.unit != SPECS.PILGRIM){
            // if the unit type is not determined yet
            if(this.isAttackType == -1){
                // check the visible friendly units
                var visible = this.getMyVisibleHomieBots();
                if(visible.length < 5){
                    this.isAttackType = 0;
                }
                else{
                    this.isAttackType = 1;
                } 
            }
        }

        // check if the unit has been assigned to its initial resting position
        if(this.me.unit != SPECS.CHURCH && this.me.unit != SPECS.CASTLE && this.me.unit != SPECS.PILGRIM){
            if (this.assignedLoc.length == 0) {
                this.nextValidLoc();
            }
            else {
                // check if it is there
                if(this.me.x == this.assignedLoc[0] && this.me.y == this.assignedLoc[1]){
                    this.atAssignedLoc = 1;
                }                
                // if not there move in that direction
                if(!this.atAssignedLoc){
                    this.nextValidLoc();
                    let target = this.assignedLoc;
                    this.destination = {x:target[0], y:target[1]};
                    const choice = nav.goto(
                        this.me,
                        this.destination,
                        this.map,
                        // this.getPassableMap(),
                        this.getVisibleRobotMap(),
                        SPECS["UNITS"][this.me.unit]["SPEED"]);
                    return this.move(choice.x, choice.y)
                }
            }
        }
        

        // msg = this.encodeMessage(4, 2, 3)
        // 
        step++;
        this.getMyResourceCoordinateList();
        this.setMyAttackCoordinate();
        
        
        if (this.me.unit === SPECS.PILGRIM) { //PILGRIM
            //
            
            // On the first turn, find out our base
            if (!this.castle) {
                this.castle = this.getVisibleRobots()
                    .filter(robot => robot.team === this.me.team && (robot.unit === SPECS.CASTLE || robot.unit === SPECS.CHURCH))[0];
                
            }
            
            if (this.getMapSymmetry==-1){
                this.getMapSymmetry();
                this.getMyResourceCoordinateList();
            }
            
            let getRandDestination = () =>{
                let temp = nav.getRandomResourceCoordinates(this.resourceCoordinateList);
                return temp;
            };
            if(!this.pilgrimResourceAssigned){
                
                // assign it to random location
                this.pilgrimResourceAssigned=1;
                this.destination = getRandDestination();
                
                // throw "lbuhbue";
            }
            
            //stop mining logic
            if((this.me.fuel >=100 || this.me.karbonite>=20) && this.returning==0){
                
                this.returning=1;
                // this.destination=this.castle;
                this.destination = this.getAdjacentEmpty(this.castle);
                this.actualLoc = this.castle;
                let visibleAllyBots = this.getMyVisibleHomieBots();
                let len=visibleAllyBots.length;
                let churchloc={
                    x:-1,
                    y:-1
                };
                for(let i=0;i<len;i++){
                    let current=visibleAllyBots[i];
                    if(current.unit==SPECS.CHURCH || current.unit == SPECS.CASTLE){
                        churchloc.x=current.x;
                        churchloc.y=current.y;
                        break;
                    }
                }

                if(churchloc.x!=-1){//church already therer
                    this.destination=this.getAdjacentEmpty(churchloc);
                    this.actualLoc=churchloc;
                }
                else{ // no church
                    if(this.fuel>=200 && this.karbonite>=50){
                        let possibleLoc=this.getAdjacentEmptyNotOnResource(this.me);
                        
                        
                        if(possibleLoc.x!=-1){
                            this.destination=this.getAdjacentEmpty(churchloc);
                            this.actualLoc=churchloc;
                            return this.buildUnit(SPECS.CHURCH,possibleLoc.x-this.me.x,possibleLoc.y-this.me.y);
                        }
                    }
                }

            }
            // 
            //return logic
            if(this.returning){
                
                if (nav.sqDist(this.me, this.actualLoc) <= 2) {
                    this.returning=0;
                    let prevdest = this.actualLoc;
                    if(this.actualLoc==this.castle){
                        this.destination= getRandDestination();
                    }
                    else{
                        this.destination = nav.getClosestResourceCoordinate(this.me, this.getVisibleRobotMap(),this.resourceCoordinateList,this.fuel,this.karbonite);
                    }
                    
                    
                    return this.give(
                        prevdest.x - this.me.x,
                        prevdest.y - this.me.y,
                        this.me.karbonite,
                        this.me.fuel);
                }
                
            }
            else{
                //assign random locations if current location is getting mined
                let maxtry = 1;
                while(maxtry > 0){
                    --maxtry;
                    if(nav.sqDist(this.me,this.destination) != 1) break;
                    let visMap = this.getVisibleRobotMap();
                    if(visMap[this.destination.y][this.destination.x] == 0){
                        break;
                    }
                    
                    this.destination = nav.getClosestResourceCoordinate(this.me, this.getVisibleRobotMap(),this.resourceCoordinateList,this.fuel,this.karbonite);  
                    
                }
                //mine if at location

                if(nav.sqDist(this.me,this.destination) == 0){
                    let visibleAllyBots = this.getMyVisibleHomieBots();
                    let len = visibleAllyBots.length;
                    let churchloc = {
                        x: -1,
                        y: -1
                    };
                    for (let i = 0; i < len; i++) {
                        let current = visibleAllyBots[i];
                        if (current.unit == SPECS.CHURCH || current.unit == SPECS.CASTLE) {
                            churchloc.x = current.x;
                            churchloc.y = current.y;
                            break;
                        }
                    }

                    if (churchloc.x != -1) ;
                    else { // no church
                        if (this.fuel >= 200 && this.karbonite >= 50) {
                            let possibleLoc = this.getAdjacentEmptyNotOnResource(this.me);
                            
                            
                            if (possibleLoc.x != -1) {
                                return this.buildUnit(SPECS.CHURCH, possibleLoc.x - this.me.x, possibleLoc.y - this.me.y);
                            }
                        }
                    }
                    
                    return this.mine();
                }

            }
            // If we have nothing else to do, move to our destination.
            
            const choice = nav.goto(
                this.me,
                this.destination,
                this.map,
                // this.getPassableMap(),
                this.getVisibleRobotMap(),
                SPECS["UNITS"][this.me.unit]["SPEED"]);
            if(choice.nopath == 1 && this.returning){
                this.destination=this.getAdjacentEmpty(this.actualLoc);
                 choice = nav.goto(
                    this.me,
                    this.destination,
                    this.map,
                    // this.getPassableMap(),
                    this.getVisibleRobotMap(),
                    SPECS["UNITS"][this.me.unit]["SPEED"]);
            }
            
            
            return this.move(choice.x, choice.y);
        }

        else if (this.me.unit === SPECS.CASTLE) {
            
            
            if (this.step === 0) {
                this.attacktrigger = Math.floor(Math.random() * 200) + 200;
                this.getMapSymmetry();
                if (this.mapSymmetryType === 1) {
                    // symmetry along x
                    var len_x = this.map.length;
                    this.myEnemyCastle = [len_x - 1 - this.me.x, this.me.y];
                }
                else {
                    // symmetry along y
                    var len_y = this.map.length;
                    this.myEnemyCastle = [this.me.x, len_y - 1 - this.me.y];
                }
            }
            // castle coordinates
            const loc_x = this.me.x;
            const loc_y = this.me.y;

            // determine location to build the object
            let availablePassableNeighbours = [];
            for (let i = -1; i <= 1; ++i) {
                for (let j = -1; j <= 1; ++j) {
                    if (i === 0 && j === 0) {   
                        continue;
                    }
                    if (loc_x + i >= 0 && loc_x + i < this.map.length && loc_y + j >= 0 && loc_y + j < this.map.length) {
                        if (this.map[loc_y + j][loc_x + i] === true) {
                            availablePassableNeighbours.push([loc_x + i, loc_y + j]);
                        }
                    }
                }
            }

            // see if any of the cells being considered are already full
            var visibleBots = this.getVisibleRobots();
            var adjacentBots = visibleBots.filter((r) => {
                if (Math.abs(r.x - loc_x) <= 1 && Math.abs(r.y - loc_y) <= 1) {
                    return true;
                }
                return false;
            });

            

            let availableBuildLocations = availablePassableNeighbours.filter((r) => {
                for (let i = 0; i < adjacentBots.length; ++i) {
                    if (adjacentBots[i].x == r[0] && adjacentBots[i].y == r[1]) {
                        return false;
                    }
                }
                return true;
            });


            if (availableBuildLocations.length === 0) {
                
                return;
            }

            const choose_loc = Math.floor(Math.random() * availableBuildLocations.length);
            const build_x = availableBuildLocations[choose_loc][0] - this.me.x;
            const build_y = availableBuildLocations[choose_loc][1] - this.me.y;

            

            const token = Math.random();

            let checkPilgrim = this.buildBotProbability[0];
            let checkCrusader = this.buildBotProbability[0] + this.buildBotProbability[1];
            let checkProphet = this.buildBotProbability[0] + this.buildBotProbability[1] + this.buildBotProbability[2];
            let checkPreacher = this.buildBotProbability[0] + this.buildBotProbability[1] + this.buildBotProbability[2] + this.buildBotProbability[3];

            // CHANGE....
            // checkPilgrim=1;
            
            
            
            // if(this.karbonite<90) return;
            if (token < checkPilgrim) {
                // create Pilgrim

                const required_karbonite = SPECS['UNITS'][SPECS['PILGRIM']]['CONSTRUCTION_KARBONITE'];
                const required_fuel = SPECS['UNITS'][SPECS['PILGRIM']]['CONSTRUCTION_FUEL'];

                
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    
                    return this.buildUnit(SPECS.PILGRIM, build_x, build_y);
                }
            }
            else if (token < checkCrusader) {
                // create Crusader
                const required_karbonite = SPECS['UNITS'][SPECS['CRUSADER']]['CONSTRUCTION_KARBONITE'];
                const required_fuel = SPECS['UNITS'][SPECS['CRUSADER']]['CONSTRUCTION_FUEL'];
                
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    
                    return this.buildUnit(SPECS.CRUSADER, build_x, build_y);
                }
            }
            else if (token < checkProphet) {
                // create Pilgrim
                const required_karbonite = SPECS['UNITS'][SPECS['PROPHET']]['CONSTRUCTION_KARBONITE'];
                const required_fuel = SPECS['UNITS'][SPECS['PROPHET']]['CONSTRUCTION_FUEL'];
                
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    
                    return this.buildUnit(SPECS.PROPHET, build_x, build_y);
                }
            }
            else {
                // create Pilgrim
                const required_karbonite = SPECS['UNITS'][SPECS['PREACHER']]['CONSTRUCTION_KARBONITE'];
                const required_fuel = SPECS['UNITS'][SPECS['PREACHER']]['CONSTRUCTION_FUEL'];
                
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    
                    return this.buildUnit(SPECS.PREACHER, build_x, build_y);
                }
            }

        }
        else if(this.me.unit === SPECS.CRUSADER || this.me.unit === SPECS.PREACHER || this.me.unit === SPECS.PROPHET){
            // if (this.targetAttack.x != -1 && this.targetAttack.y != -1) {
                return this.attack1();
            // }
        }
        else{
            
            {
                    this.hasProbUpdate = 1;
                    this.buildBotProbability = [0.05, 0.25, 0.3, 0.4];

                if (this.castleWait > 0) {
                    this.castleWait--;
                }
                else {
                    if (this.karbonite < 50 && this.waitOneTurn == 1) {
                        return;
                    }
                    if (this.waitOneTurn) {
                        this.waitOneTurn = 0;
                        return;
                    }
                    this.waitOneTurn = 1;
                    this.castleWait = 4;
                }
            }
            // castle coordinates
            const loc_x = this.me.x;
            const loc_y = this.me.y;

            // determine location to build the object
            let availablePassableNeighbours = [];
            for (let i = -1; i <= 1; ++i) {
                for (let j = -1; j <= 1; ++j) {
                    if (i === 0 && j === 0) {
                        continue;
                    }
                    if (loc_x + i >= 0 && loc_x + i < this.map.length && loc_y + j >= 0 && loc_y + j < this.map.length) {
                        if (this.map[loc_y + j][loc_x + i] === true) {
                            availablePassableNeighbours.push([loc_x + i, loc_y + j]);
                        }
                    }
                }
            }

            // see if any of the cells being considered are already full
            var visibleBots = this.getVisibleRobots();
            var adjacentBots = visibleBots.filter((r) => {
                if (Math.abs(r.x - loc_x) <= 1 && Math.abs(r.y - loc_y) <= 1) {
                    return true;
                }
                return false;
            });

            

            let availableBuildLocations = availablePassableNeighbours.filter((r) => {
                for (let i = 0; i < adjacentBots.length; ++i) {
                    if (adjacentBots[i].x == r[0] && adjacentBots[i].y == r[1]) {
                        return false;
                    }
                }
                return true;
            });


            if (availableBuildLocations.length === 0) {
                
                return;
            }

            const choose_loc = Math.floor(Math.random() * availableBuildLocations.length);
            const build_x = availableBuildLocations[choose_loc][0] - this.me.x;
            const build_y = availableBuildLocations[choose_loc][1] - this.me.y;

            

            const token = Math.random();

            let checkPilgrim = this.buildBotProbability[0];
            let checkCrusader = this.buildBotProbability[0] + this.buildBotProbability[1];
            let checkProphet = this.buildBotProbability[0] + this.buildBotProbability[1] + this.buildBotProbability[2];
            let checkPreacher = this.buildBotProbability[0] + this.buildBotProbability[1] + this.buildBotProbability[2] + this.buildBotProbability[3];

            // CHANGE....
            // checkPilgrim=1;
            
            
            
            // if(this.karbonite<90) return;
            if (token < checkPilgrim) {
                // create Pilgrim

                const required_karbonite = SPECS['UNITS'][SPECS['PILGRIM']]['CONSTRUCTION_KARBONITE'];
                const required_fuel = SPECS['UNITS'][SPECS['PILGRIM']]['CONSTRUCTION_FUEL'];

                
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    
                    return this.buildUnit(SPECS.PILGRIM, build_x, build_y);
                }
            }
            else if (token < checkCrusader) {
                // create Crusader
                const required_karbonite = SPECS['UNITS'][SPECS['CRUSADER']]['CONSTRUCTION_KARBONITE'];
                const required_fuel = SPECS['UNITS'][SPECS['CRUSADER']]['CONSTRUCTION_FUEL'];
                
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    
                    return this.buildUnit(SPECS.CRUSADER, build_x, build_y);
                }
            }
            else if (token < checkProphet) {
                // create Pilgrim
                const required_karbonite = SPECS['UNITS'][SPECS['PROPHET']]['CONSTRUCTION_KARBONITE'];
                const required_fuel = SPECS['UNITS'][SPECS['PROPHET']]['CONSTRUCTION_FUEL'];
                
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    
                    return this.buildUnit(SPECS.PROPHET, build_x, build_y);
                }
            }
            else {
                // create Pilgrim
                const required_karbonite = SPECS['UNITS'][SPECS['PREACHER']]['CONSTRUCTION_KARBONITE'];
                const required_fuel = SPECS['UNITS'][SPECS['PREACHER']]['CONSTRUCTION_FUEL'];
                
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    
                    return this.buildUnit(SPECS.PREACHER, build_x, build_y);
                }
            }

            
        }

    }
}
var robot = new MyRobot();
