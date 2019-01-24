import { BCAbstractRobot, SPECS } from 'battlecode';
import nav from './nav.js';

let step = -1;

// eslint-disable-next-line no-unused-vars
class MyRobot extends BCAbstractRobot {
    constructor() {
        super();
        this.pendingRecievedMessages = {};
        this.enemyCastles = [];
        // 
        this.buildBotProbability = [0.4, 0.2, 0.3, 0.1]
        this.availableBuildLocations = []

        this.mapSymmetryType = -1 // 1 -> horizontal symmetry (X), 2 -> vertical (Y)
        this.resourceCoordinateList = [] // [[x, y, type = 0 if fuel, 1 if karbonite]....]

        this.myEnemyCastle = [] // X, Y
        this.attackStatusFlag = -1
        this.random_move = [0, 0]
        this.isAttackType = -1

        this.assignedLoc = []
        this.atAssignedLoc = 0
        this.enemyResourceCoordinateList = [];
        this.targetAttack = {x: -1, y: -1}
        this.ttl = 0

        this.waitOneTurn = 1
        this.castleWait = 4
        this.returning=0;

        this.attacktrigger = -1
        this.step = -1
    }

    decode(msg) {
        let decodedMsg = {
            code: null,
            x: null,
            y: null,
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
        var msg = opcode << 1
        if (x != -1 && y != -1) {
            msg |= 1
            msg |= (x << 4)
            msg |= (y << 10)
        }
        return msg
    }
    sendMessage(msg, radius) {
        if (radius == 0) { //castle
            this.castle_talk(msg);
        }
        else {
            radius*=radius;
            this.signal(msg, radius);
        }
    }

    setMyAttackCoordinate() {
        let signal = -1
        let sensed = this.getVisibleRobots()
        for (let i = 0; i < sensed.length; ++i) {
            let r = sensed[i]
            if (r.team == this.me.team && r.unit == SPECS.CASTLE) {
                signal = r.signal
                break;
            }
        }
        if (signal != -1) {
            this.targetAttack = this.decode(signal)
        }
    }

    getMyVisibleHomieBots() {
        // 
        var sensed = this.getVisibleRobots()
        var visible = sensed.filter((r) => {
            if (r.team != this.me.team) {
                return false;
            }
            if (nav.sqDist(r, this.me) <= SPECS['UNITS'][this.me.unit]['VISION_RADIUS']) {
                return true;
            }
            return false;
        })
        return visible;
    }    
    

    nextValidLoc(){
        let len_x = this.map.length
        let len_y = len_x
        let mnm = 10000, mnx = 10000, mny = 10000
        let botMap = this.getVisibleRobotMap()
        
        for(let i = 0; i < len_y; ++i){
            for(let j = 0; j < len_x; ++j){
                if(i%2 != j%2){
                    continue;
                }
                if(this.map[i][j] == true && botMap[i][j] == false){
                    let dis = (this.me.x - j) ** 2 + (this.me.y - i) ** 2
                    if(dis < mnm){
                        mnm = dis
                        mnx = j
                        mny = i
                    }
                }
            }
        }
        this.assignedLoc = [mnx, mny]
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
        return {x:0,y:0,};
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
        this.log("Getting Coordinate List")
        if(this.mapSymmetryType === -1){
            this.getMapSymmetry();
        }
        this.log("Symmetry type:"+this.mapSymmetryType);
        if(this.mapSymmetryType === 1){
            // symmetry along x
            // identify which side our territory is
            var offset = 0
            var len_y = this.map.length
            var len_x = this.map.length
            if(this.me.x > Math.floor(len_x/2)){
                offset = Math.floor(len_x/2);
            }
            for(let cy = 0; cy < len_y; ++cy){
                for(let cx = offset; cx < offset+Math.floor(len_x/2); ++cx){
                    if(this.fuel_map[cy][cx] == true){
                        this.resourceCoordinateList.push([cx, cy, 0])
                    }
                    if(this.karbonite_map[cy][cx] == true){
                        this.resourceCoordinateList.push([cx, cy, 1])
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
                        this.enemyResourceCoordinateList.push([cx, cy, 0])
                    }
                    if (this.karbonite_map[cy][cx] == true) {
                        this.enemyResourceCoordinateList.push([cx, cy, 1])
                    }
                }
            }            
        }
        else{
            // symmetry along y
            // identify which side our territory is
            var offset = 0
            var len_y = this.map.length
            var len_x = this.map.length
            if(this.me.y > Math.floor(len_y/2)){
                offset = Math.floor(len_y/2);
            }
            for(let cy = offset; cy < offset+Math.floor(len_y/2) && cy<len_y; ++cy){
                for(let cx = 0; cx < len_x; ++cx){
                    if(this.fuel_map[cy][cx] === true){
                        this.resourceCoordinateList.push([cx, cy, 0])
                    }
                    if(this.karbonite_map[cy][cx] === true){
                        this.resourceCoordinateList.push([cx, cy, 1])
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
                        this.enemyResourceCoordinateList.push([cx, cy, 0])
                    }
                    if (this.karbonite_map[cy][cx] === true) {
                        this.enemyResourceCoordinateList.push([cx, cy, 1])
                    }
                }
            }            
        }
    }

    getMapSymmetry(){
        this.log("Getting map symmetry")
        const len_y = this.map.length
        const len_x = this.map.length
        
        // check for symmetry along x axis
        for(let cy = 0; cy < len_y; ++cy){
            for(let cx = 0; cx < len_x; ++cx){
                if(this.map[cy][cx] !== this.map[cy][len_x-1-cx]){
                    this.mapSymmetryType = 2
                    // if not symmetric in x, it must be in y
                }
            }
        }
        if(this.mapSymmetryType === -1){
            this.mapSymmetryType = 1
            // if symmetric in x, then set accordingly
        }
    }

    updateBuildProbability() {
        // do something with buildBotProbability

    }
    attackIfVisible(){
        // see if something can be attacked from current location
        var visible = this.getVisibleRobots()
        var self = this
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

        this.log(attackable);
        let val = -1;
        if (attackable.length > 0) {
            this.log("attacking")
            // attack first robot
            var r = attackable[0];
            this.log(r);
            // throw new Error();
            this.log('attacking! ' + r + ' at loc ' + (r.x - this.me.x, r.y - this.me.y));
            val = this.attack(r.x - this.me.x, r.y - this.me.y);
        }
        return val;
    }
    attack1(){
        var target_x = this.targetAttack.x
        var target_y = this.targetAttack.y

        let canAttack = this.attackIfVisible();
        if(canAttack !== -1){
            return canAttack;
        }
        let destination = { x: target_x, y: target_y, }
        if (target_x == -1 || target_y == -1) {
            return;
        }

        this.log("I am here: " + this.me.x + " " + this.me.y)
        this.log("I am going here: " + target_x + " " + target_y)
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
        if(this.ttl == 5){
            choice.x = 0;
            choice.y = 0;
        }
        return this.move(choice.x, choice.y)
    }
    
    
    
    
    
    turn() {
        this.step++;
        this.log("Step = ==== ====== ===" + step + " " + this.step)
        if(this.me.unit == SPECS.CASTLE){
            
            let canAttack = this.attackIfVisible();
            if (canAttack !== -1) {
                this.log("AAAADSJLNLKJFDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDNVNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN");
                // throw new Error();
                return canAttack;
            }
            if(this.myEnemyCastle.length > 0 && this.attacktrigger != -1){
                let target = { x: this.myEnemyCastle[0], y: this.myEnemyCastle[1] }
                if (this.step % this.attacktrigger == 0) {
                    this.log("hihi" + target.x + " " + target.y + " " + this.step + "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                    // let sendAttack = this.encodeMessage(0, target.x, target.y)
                    let sendAttack = this.encodeMessage(0, target.x, target.y)
                    this.sendMessage(sendAttack, 64)
                }
            }
            

            if(this.step > 0){
                this.log("CASTLE CASTLE " + this.attacktrigger)
            }
            if(this.castleWait > 0){
                this.castleWait--;
            }
            else{
                if(this.karbonite < 50 && this.waitOneTurn == 1){
                    return;
                }
                if(this.waitOneTurn){
                    this.waitOneTurn = 0;
                    return;
                }
                this.waitOneTurn = 1;
                this.castleWait = 4;
            }
        }

        if(this.me.unit != SPECS.CHURCH && this.me.unit != SPECS.CASTLE && this.me.unit != SPECS.PILGRIM){
            // if the unit type is not determined yet
            if(this.isAttackType == -1){
                // check the visible friendly units
                var visible = this.getMyVisibleHomieBots()
                if(visible.length < 5){
                    this.isAttackType = 0
                }
                else{
                    this.isAttackType = 1
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
                    this.atAssignedLoc = 1
                }                
                // if not there move in that direction
                if(!this.atAssignedLoc){
                    this.nextValidLoc()
                    let target = this.assignedLoc
                    this.destination = {x:target[0], y:target[1]}
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
        // this.log(msg)
        step++;
        this.setMyAttackCoordinate()
        this.log("symmetry type is: " + this.mapSymmetryType)
        this.getMyResourceCoordinateList()
        this.log("RESOURCE LIST --- " + this.resourceCoordinateList)
        if (false) {
            this.log("PROF");
            if(this.targetAttack.x != -1 && this.targetAttack.y != -1){
                return this.attack1();
            }
            
        } else if (this.me.unit === SPECS.PILGRIM) { //PILGRIM
            //
            this.log("PILGRIM");
            // On the first turn, find out our base
            if (!this.castle) {
                this.castle = this.getVisibleRobots()
                    .filter(robot => robot.team === this.me.team && robot.unit === SPECS.CASTLE)[0];
            }
            this.log("before get sym");
            if (this.getMapSymmetry==-1){
                this.getMapSymmetry();
                this.getMyResourceCoordinateList();
            }
            this.log("after get sym");
            let getRandDestination = () =>{
                let temp = nav.getRandomResourceCoordinates(this.resourceCoordinateList);
                return temp;
            }
            if(!this.pilgrimResourceAssigned){
                this.log("Pilgrim has been assigned a loc!");
                // assign it to random location
                this.pilgrimResourceAssigned=1;
                this.destination = getRandDestination();
                this.log("Pilgram assigned mine location" +this.destination.x + " "+this.destination.y);
                // throw "lbuhbue";
            }
            this.log("Robot id lmao:"+this.me.id+" "+this.pilgrimResourceAssigned+" My pos :"+this.me.x+ " "+ this.me.y + " My Dest: "+ this.destination.x +" "+this.destination.y);
            //stop mining logic
            if((this.me.fuel >=100 || this.me.karbonite>=20) && this.returning==0){
                this.log("Done mining!");
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
                        this.log("Currently at:" + this.me.x + " " + this.me.y);
                        this.log("Building at:"+possibleLoc.x+" "+possibleLoc.y);
                        if(possibleLoc.x!=-1){
                            this.destination=this.getAdjacentEmpty(churchloc);
                            this.actualLoc=churchloc;
                            return this.buildUnit(SPECS.CHURCH,possibleLoc.x-this.me.x,possibleLoc.y-this.me.y);
                        }
                    }
                }

            }
            // this.log("")
            //return logic
            if(this.returning){
                this.log("Returning!");
                if (nav.sqDist(this.me, this.actualLoc) <= 2) {
                    this.returning=0;
                    let prevdest = this.actualLoc;
                    if(this.actualLoc==this.castle){
                        this.destination= getRandDestination();
                    }
                    else{
                        this.destination = nav.getClosestResourceCoordinate(this.me, this.getVisibleRobotMap(),this.resourceCoordinateList,this.fuel);
                    }
                    this.log("Giving all my resouces to:"+prevdest.x+" "+prevdest.y)
                    this.log("New destination:"+this.destination.x+" "+this.destination.y);
                    return this.give(
                        prevdest.x - this.me.x,
                        prevdest.y - this.me.y,
                        this.me.karbonite,
                        this.me.fuel);
                }
                this.log("Leaving returning");
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
                    this.log("Assigning new location to mine! Old locations:"+this.destination.x+" "+this.destination.y);
                    this.destination = nav.getClosestResourceCoordinate(this.me, this.getVisibleRobotMap(),this.resourceCoordinateList,this.fuel);  
                    this.log("New location:"+this.destination.x+" "+this.destination.y);
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

                    if (churchloc.x != -1) {//church already therer
                        
                    }
                    else { // no church
                        if (this.fuel >= 200 && this.karbonite >= 50) {
                            let possibleLoc = this.getAdjacentEmptyNotOnResource(this.me);
                            this.log("Currently at:" + this.me.x + " " + this.me.y);
                            this.log("Building at:" + possibleLoc.x + " " + possibleLoc.y);
                            if (possibleLoc.x != -1) {
                                return this.buildUnit(SPECS.CHURCH, possibleLoc.x - this.me.x, possibleLoc.y - this.me.y);
                            }
                        }
                    }
                    this.log("Mining at position:"+this.destination.x + " "+this.destination.y);
                    return this.mine();
                }

            }
            // If we have nothing else to do, move to our destination.
            this.log(this.me.x + ' '+this.me.y + ' ' +this.destination.x+ ' ' +this.destination.y);
            const choice = nav.goto(
                this.me,
                this.destination,
                this.map,
                // this.getPassableMap(),
                this.getVisibleRobotMap(),
                SPECS["UNITS"][this.me.unit]["SPEED"]);
            this.log("Square chosen:"+this.destination.x+this.destination.y);
            this.log("Units moved:"+choice.x+" "+choice.y);
            return this.move(choice.x, choice.y);
        }

        else if (this.me.unit === SPECS.CASTLE) {
            this.log("CASTLE");
            
            if (this.step === 0) {
                this.attacktrigger = Math.floor(Math.random() * 10) + 20
                this.getMapSymmetry()
                if (this.mapSymmetryType === 1) {
                    // symmetry along x
                    var len_x = this.map.length
                    this.myEnemyCastle = [len_x - 1 - this.me.x, this.me.y]
                }
                else {
                    // symmetry along y
                    var len_y = this.map.length
                    this.myEnemyCastle = [this.me.x, len_y - 1 - this.me.y]
                }
            }


            const probabilityUpdateRequired = false
            //
            // logic to determine whether an update is required
            //

            if (probabilityUpdateRequired) {
                this.updateBuildProbability()
            }
            // castle coordinates
            const loc_x = this.me.x
            const loc_y = this.me.y

            // determine location to build the object
            let availablePassableNeighbours = []
            for (let i = -1; i <= 1; ++i) {
                for (let j = -1; j <= 1; ++j) {
                    if (i === 0 && j === 0) {   
                        continue;
                    }
                    if (this.map[loc_y + j][loc_x + i] === true) {
                        availablePassableNeighbours.push([loc_x + i, loc_y + j])
                    }
                }
            }

            // see if any of the cells being considered are already full
            var visibleBots = this.getVisibleRobots()
            var adjacentBots = visibleBots.filter((r) => {
                if (Math.abs(r.x - loc_x) <= 1 && Math.abs(r.y - loc_y) <= 1) {
                    return true;
                }
                return false;
            });

            this.log(adjacentBots)

            let availableBuildLocations = availablePassableNeighbours.filter((r) => {
                for (let i = 0; i < adjacentBots.length; ++i) {
                    if (adjacentBots[i].x == r[0] && adjacentBots[i].y == r[1]) {
                        return false;
                    }
                }
                return true;
            });


            if (availableBuildLocations.length === 0) {
                this.log("No location to build a bot ... ");
                return;
            }

            const choose_loc = Math.floor(Math.random() * availableBuildLocations.length)
            const build_x = availableBuildLocations[choose_loc][0] - this.me.x
            const build_y = availableBuildLocations[choose_loc][1] - this.me.y

            this.log("Build Location is:  " + availableBuildLocations[choose_loc][0] + ',' + availableBuildLocations[choose_loc][1])

            const token = Math.random()

            let checkPilgrim = this.buildBotProbability[0]
            let checkCrusader = this.buildBotProbability[0] + this.buildBotProbability[1]
            let checkProphet = this.buildBotProbability[0] + this.buildBotProbability[1] + this.buildBotProbability[2]
            let checkPreacher = this.buildBotProbability[0] + this.buildBotProbability[1] + this.buildBotProbability[2] + this.buildBotProbability[3]

            // CHANGE....
            // checkPilgrim=1;
            this.log("token is " + token + ' ' + checkPilgrim + ' ' + checkPreacher)
            this.log("KARBONITE = " + this.karbonite)
            this.log("fuel = " + this.fuel)
            // if(this.karbonite<90) return;
            if (token < checkPilgrim) {
                // create Pilgrim

                const required_karbonite = SPECS['UNITS'][SPECS['PILGRIM']]['CONSTRUCTION_KARBONITE']
                const required_fuel = SPECS['UNITS'][SPECS['PILGRIM']]['CONSTRUCTION_FUEL']

                this.log(required_karbonite + ' ' + required_fuel)
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    this.log('building a pilgrim at ' + (this.me.x + build_x) + ',' + (this.me.y + build_y));
                    return this.buildUnit(SPECS.PILGRIM, build_x, build_y);
                }
            }
            else if (token < checkCrusader) {
                // create Crusader
                const required_karbonite = SPECS['UNITS'][SPECS['CRUSADER']]['CONSTRUCTION_KARBONITE']
                const required_fuel = SPECS['UNITS'][SPECS['CRUSADER']]['CONSTRUCTION_FUEL']
                this.log(required_karbonite + ' ' + required_fuel)
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    this.log('building a crusader at ' + (this.me.x + build_x) + ',' + (this.me.y + build_y));
                    return this.buildUnit(SPECS.CRUSADER, build_x, build_y);
                }
            }
            else if (token < checkProphet) {
                // create Pilgrim
                const required_karbonite = SPECS['UNITS'][SPECS['PROPHET']]['CONSTRUCTION_KARBONITE']
                const required_fuel = SPECS['UNITS'][SPECS['PROPHET']]['CONSTRUCTION_FUEL']
                this.log(required_karbonite + ' ' + required_fuel)
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    this.log('building a PROPHET at ' + (this.me.x + build_x) + ',' + (this.me.y + build_y));
                    return this.buildUnit(SPECS.PROPHET, build_x, build_y);
                }
            }
            else {
                // create Pilgrim
                const required_karbonite = SPECS['UNITS'][SPECS['PREACHER']]['CONSTRUCTION_KARBONITE']
                const required_fuel = SPECS['UNITS'][SPECS['PREACHER']]['CONSTRUCTION_FUEL']
                this.log(required_karbonite + ' ' + required_fuel)
                if (this.karbonite >= required_karbonite && this.fuel >= required_fuel) {
                    this.log('building a PREACHER at ' + (this.me.x + build_x) + ',' + (this.me.y + build_y));
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
            // if (this.targetAttack.x != -1 && this.targetAttack.y != -1) {
            //     return this.attack1();
            // }
            // return this.attack1();
        }

    }
}