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
        this.buildBotProbability = [0.1, 0.2, 0.3, 0.4]
        this.availableBuildLocations = []

        this.mapSymmetryType = -1 // 1 -> horizontal symmetry (X), 2 -> vertical (Y)
        this.resourceCoordinateList = [] // [[x, y, type = 0 if fuel, 1 if karbonite]....]

        this.myEnemyCastle = [] // X, Y

    }

    getMyResourceCoordinateList(){
        if(this.resourceCoordinateList.length > 0){
            return
        }
        this.log("Getting Coordinate List")
        if(this.mapSymmetryType === -1){
            this.getMapSymmetry();
        }
        if(this.mapSymmetryType === 1){
            // symmetry along x
            // identify which side our territory is
            var offset = 0
            var len_y = this.map.length
            var len_x = this.map[0].length
            if(this.me.x > len_x/2){
                offset = len_x/2;
            }
            for(let cy = 0; cy < len_y; ++cy){
                for(let cx = offset; cx < offset+len_x/2; ++cx){
                    if(this.fuel_map[cy][cx] === true){
                        this.resourceCoordinateList.push([cx, cy, 0])
                    }
                    if(this.karbonite_map[cy][cx] === true){
                        this.resourceCoordinateList.push([cx, cy, 1])
                    }
                }
            }
        }
        else{
            // symmetry along y
            // identify which side our territory is
            var offset = 0
            var len_y = this.map.length
            var len_x = this.map[0].length
            if(this.me.y > len_y/2){
                offset = len_y/2;
            }
            for(let cy = offset; cy < offset+len_y/2; ++cy){
                for(let cx = 0; cx < len_x; ++cx){
                    if(this.fuel_map[cy][cx] == true){
                        this.resourceCoordinateList.push([cx, cy, 0])
                    }
                    if(this.karbonite_map[cy][cx] == true){
                        this.resourceCoordinateList.push([cx, cy, 1])
                    }
                }
            }
        }
    }

    getMapSymmetry(){
        this.log("Getting map symmetry")
        const len_y = this.map.length
        const len_x = this.map[0].length
        
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

    turn() {
        step++;
        this.log("symmetry type is: " + this.mapSymmetryType)
        this.getMyResourceCoordinateList()
        this.log("RESOURCE LIST --- " + this.resourceCoordinateList)
        if (this.me.unit === SPECS.PROPHET) {
            this.log('START TURN ' + step);
            this.log('health: ' + this.me.health);

            var visible = this.getVisibleRobots();

            // this sucks I'm sorry...
            // This is actually fine. Or use .bind()
            var self = this; // 'this' fails to properly identify MyRobot when used inside of anonymous function below :(

            // get attackable robots
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

            const attacking = visible.filter(r => {
                if (r.team === this.me.team) {
                    return false;
                }

                if (nav.sqDist(r, this.me) <= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[0]) {
                    return true;
                } else {
                    return false;
                }
            });

            if (attacking.length > 0) {
                const attacker = attacking[0];
                const dir = nav.getDir(this.me, attacker);
                const otherDir = {
                    x: -dir.x,
                    y: -dir.y,
                };
                return this.move(otherDir.x, otherDir.y);
            }



            if (!this.pendingMessage) {
                for (let i = 0; i < visible.length; i++) {
                    const robot = visible[i];
                    if (robot.team !== this.me.team && robot.unit === SPECS.CASTLE && this.enemyCastles.indexOf(robot.x * 64 + robot.y) < 0) {
                        this.log('ENEMY CASTLE FOUND!');
                        this.pendingMessage = robot.y;
                        this.castleTalk(robot.x);
                        this.enemyCastles.push(robot.x * 64 + robot.y);
                    }
                }
            } else {
                this.castleTalk(this.pendingMessage);
                this.pendingMessage = null;
            }

            this.log(attackable);

            if (attackable.length > 0) {
                // attack first robot
                var r = attackable[0];
                this.log('' + r);
                this.log('attacking! ' + r + ' at loc ' + (r.x - this.me.x, r.y - this.me.y));
                return this.attack(r.x - this.me.x, r.y - this.me.y);
            }
            // this.log("Crusader health: " + this.me.health);'
            if (!this.destination) {
                this.destination = nav.reflect(this.me, this.getPassableMap(), this.me.id % 2 === 0);
            }

            const choice = nav.goto(
                this.me,
                this.destination,
                this.map,
                this.getPassableMap(),
                this.getVisibleRobotMap());
            return this.move(choice.x, choice.y);
        } else if (this.me.unit === SPECS.PILGRIM) {
            //
            // On the first turn, find out our base
            if (!this.castle) {
                this.castle = this.getVisibleRobots()
                    .filter(robot => robot.team === this.me.team && robot.unit === SPECS.CASTLE)[0];
            }

            // // if we don't have a destination, figure out what it is.
            // if (!this.destination) {
            //     this.destination = nav.getClosestKarbonite(this.me, this.getKarboniteMap());
            // }

            // // If we're near our destination, do the thing
            // if (this.me.karbonite === 20) {
            //     this.destination = this.castle;
            //     if (nav.sqDist(this.me, this.destination) <= 2) {
            //         this.destination = nav.getClosestKarbonite(this.me, this.getKarboniteMap());
            //         return this.give(
            //             this.castle.x - this.me.x,
            //             this.castle.y - this.me.y,
            //             this.me.karbonite,
            //             this.me.fuel);
            //     }
            // } else {
            //     if (nav.sqDist(this.me, this.destination) === 0) {
            //         return this.mine();
            //     }
            // }
            if (this.getMapSymmetry==-1){
                this.getMapSymmetry();
                this.getMyResourceCoordinateList();
            }
            // this.destination={
            //     x:42,
            //     y:14,
            // };
            let getRandDestination = () =>{
                let temp = nav.getRandomResourceCoordinates(this.resourceCoordinateList);
                return temp;
            }
            this.log("Robot id lmao:"+this.me.id+" "+this.pilgrimResourceAssigned);
            if(!this.pilgrimResourceAssigned){
                // assign it to random location
                this.pilgrimResourceAssigned=1;
                this.destination = getRandDestination();
                this.log("Pilgram assigned mine location" +this.destination.x + " "+this.destination.y);
                // throw "lbuhbue";
            }
            //stop mining logic
            if(this.me.fuel >=100 || this.me.karbonite>=20){
                this.returning=1;
                this.destination=this.castle;
            }
            //return logic
            if(this.returning){
                if (nav.sqDist(this.me, this.destination) <= 2) {
                    this.returning=0;
                    this.destination= getRandDestination();
                    return this.give(
                        this.castle.x - this.me.x,
                        this.castle.y - this.me.y,
                        this.me.karbonite,
                        this.me.fuel);
                }
            }
            else{
                //assign random locations if current location is getting mined
                let maxtry = 50;
                while(maxtry > 0){
                    --maxtry;
                    if(nav.sqDist(this.me,this.destination) != 1) break;
                    let visMap = this.getVisibleRobotMap();
                    if(visMap[this.destination.y][this.destination.x] == 0){
                        break;
                    }
                    this.destination= getRandDestination();  
                }
                //mine if at location
                if(nav.sqDist(this.me,this.destination) === 0){
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
                this.getVisibleRobotMap());

            return this.move(choice.x, choice.y);
        }

        else if (this.me.unit === SPECS.CASTLE) {

            // find the type of symmetry in step 0
            
            
            if(step === 0){
                this.getMapSymmetry()
                if(this.mapSymmetryType === 1){
                    // symmetry along x
                    var len_x = this.map[0].length
                    this.myEnemyCastle = [len_x-1-this.me.x, this.me.y]
                }
                else{
                    // symmetry along y
                    var len_y = this.map.length
                    this.myEnemyCastle = [this.me.x, len_y-1-this.me.y]
                }
            }


            const visible = this.getVisibleRobots();
            const messagingRobots = visible.filter(robot => {
                return robot.castle_talk;
            });

            for (let i = 0; i < messagingRobots.length; i++) {
                const robot = messagingRobots[i];
                if (!this.pendingRecievedMessages[robot.id]) {
                    this.pendingRecievedMessages[robot.id] = robot.castle_talk;
                } else {
                    this.enemyCastles.push({
                        x: this.pendingRecievedMessages[robot.id],
                        y: robot.castle_talk,
                    });
                    this.pendingRecievedMessages[robot.id] = null;
                }
            }

            // logs known enemy castles every 100th step 
            // if (step % 100) {
            //     this.log('KNOWN ENEMY CASTLES: ');
            //     for (let i = 0; i < this.enemyCastles.length; i++) {
            //         const { x, y } = this.enemyCastles[i];
            //         this.log(x + ',' + y);
            //     }
            // }

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
            checkPilgrim=1;
            this.log("token is " + token + ' ' + checkPilgrim + ' ' + checkPreacher)
            this.log("KARBONITE = " + this.karbonite)
            this.log("fuel = " + this.fuel)

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

    }
}