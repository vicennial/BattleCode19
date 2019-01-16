import {BCAbstractRobot, SPECS} from 'battlecode';
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
    }

    updateBuildProbability(){
        // do something with buildBotProbability

    }

    turn() {
        step++;
        if (this.me.unit === SPECS.PROPHET) {
            this.log('START TURN ' + step);
            this.log('health: ' + this.me.health);

            var visible = this.getVisibleRobots();
            
            // this sucks I'm sorry...
            // This is actually fine. Or use .bind()
            var self = this; // 'this' fails to properly identify MyRobot when used inside of anonymous function below :(

            // get attackable robots
            var attackable = visible.filter((r) => {
                if (! self.isVisible(r)){
                    return false;
                }
                const dist = (r.x-self.me.x)**2 + (r.y-self.me.y)**2;
                if (r.team !== self.me.team
                    && SPECS.UNITS[this.me.unit].ATTACK_RADIUS[0] <= dist
                    && dist <= SPECS.UNITS[this.me.unit].ATTACK_RADIUS[1] ){
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



            if(!this.pendingMessage) {
                for(let i = 0; i < visible.length; i++ ) {
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

            if (attackable.length>0){
                // attack first robot
                var r = attackable[0];
                this.log('' +r);
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
            // On the first turn, find out our base
            if (!this.castle) {
                this.castle = this.getVisibleRobots()
                    .filter(robot => robot.team === this.me.team && robot.unit === SPECS.CASTLE)[0];
            }

            // if we don't have a destination, figure out what it is.
            if (!this.destination) {
                this.destination = nav.getClosestKarbonite(this.me, this.getKarboniteMap());
            }

            // If we're near our destination, do the thing
            if (this.me.karbonite === 20) {
                this.destination = this.castle;
                if (nav.sqDist(this.me, this.destination) <= 2) {
                    this.destination = nav.getClosestKarbonite(this.me, this.getKarboniteMap());
                    return this.give(
                        this.castle.x - this.me.x,
                        this.castle.y - this.me.y,
                        this.me.karbonite,
                        this.me.fuel);
                }
            } else {
                if (nav.sqDist(this.me, this.destination) === 0) {
                    return this.mine();
                }
            }
            // If we have nothing else to do, move to our destination.
            const choice = nav.goto(
                this.me, 
                this.destination,
                this.map, 
                this.getPassableMap(), 
                this.getVisibleRobotMap());

            return this.move(choice.x, choice.y);
        }

        else if (this.me.unit === SPECS.CASTLE) {
            // this.log(SPECS)
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
            if (step % 100) {
                this.log('KNOWN ENEMY CASTLES: ');
                for(let i = 0; i < this.enemyCastles.length; i++) {
                    const {x,y} = this.enemyCastles[i];
                    this.log(x + ',' + y);
                }
            }

            const probabilityUpdateRequired = false
            //
            // logic to determine whether an update is required
            //

            if(probabilityUpdateRequired){
                updateBuildProbability()
            }
            // castle coordinates
            const loc_x = this.me.x
            const loc_y = this.me.y

            // determine location to build the object
            availablePassableNeighbours = []
            for(let i = -1; i <= 1; ++i){
                for(let j = -1; j <= 1; ++j){
                    if(i === 0 && j === 0){
                        continue;
                    }
                    if(this.map[loc_y+j][loc_x+i] === true){
                        availablePassableNeighbours.push([loc_x+i, loc_y+j])
                    }
                }
            }

            // see if any of the cells being considered are already full
            var visibleBots = this.getVisibleRobots()
            var adjacentBots = visibleBots.filter((r) => {
                if(Math.abs(r.x - loc_x) <= 1 && Math.abs(r.y - loc_y) <= 1){
                    return true;
                }
                return false;
            });

            this.log(adjacentBots)

            availableBuildLocations = availablePassableNeighbours.filter((r) => {
                for(let i = 0; i < adjacentBots.length; ++i){
                    if(adjacentBots[i].x == r[0] && adjacentBots[i].y == r[1]){
                        return false;
                    }
                }
                return true;
            });


            if(availableBuildLocations.length === 0){
                this.log("No location to build a bot ... ");
                return;
            }

            const choose_loc = Math.floor(Math.random() * availableBuildLocations.length)
            const build_x = availableBuildLocations[choose_loc][0] - this.me.x
            const build_y = availableBuildLocations[choose_loc][1] - this.me.y

            this.log("Build Location is:  " + availableBuildLocations[choose_loc][0] + ',' + availableBuildLocations[choose_loc][1])

            const token = Math.random()

            checkPilgrim = this.buildBotProbability[0]
            checkCrusader = this.buildBotProbability[0] + this.buildBotProbability[1]
            checkProphet = this.buildBotProbability[0] + this.buildBotProbability[1] + this.buildBotProbability[2]
            checkPreacher = this.buildBotProbability[0] + this.buildBotProbability[1] + this.buildBotProbability[2] + this.buildBotProbability[3]

            this.log("token is " + token + ' ' + checkPilgrim + ' ' + checkPreacher)
            this.log("KARBONITE = " + this.karbonite)
            this.log("fuel = " + this.fuel)

            if(token < checkPilgrim){
                // create Pilgrim

                const required_karbonite = SPECS['UNITS'][SPECS['PILGRIM']]['CONSTRUCTION_KARBONITE']
                const required_fuel = SPECS['UNITS'][SPECS['PILGRIM']]['CONSTRUCTION_FUEL']

                this.log(required_karbonite + ' ' + required_fuel)
                if(this.karbonite >= required_karbonite && this.fuel >= required_fuel){
                    this.log('building a pilgrim at ' + (this.me.x+build_x) + ',' + (this.me.y+build_y));
                    return this.buildUnit(SPECS.PILGRIM, build_x, build_y);
                }
            }
            else if (token < checkCrusader){
                // create Crusader
                const required_karbonite = SPECS['UNITS'][SPECS['CRUSADER']]['CONSTRUCTION_KARBONITE']
                const required_fuel = SPECS['UNITS'][SPECS['CRUSADER']]['CONSTRUCTION_FUEL']
                this.log(required_karbonite + ' ' + required_fuel)
                if(this.karbonite >= required_karbonite && this.fuel >= required_fuel){
                    this.log('building a crusader at ' + (this.me.x+build_x) + ',' + (this.me.y+build_y));
                    return this.buildUnit(SPECS.CRUSADER, build_x, build_y);
                }   
            }
            else if (token < checkProphet){
                // create Pilgrim
                const required_karbonite = SPECS['UNITS'][SPECS['PROPHET']]['CONSTRUCTION_KARBONITE']
                const required_fuel = SPECS['UNITS'][SPECS['PROPHET']]['CONSTRUCTION_FUEL']
                this.log(required_karbonite + ' ' + required_fuel)
                if(this.karbonite >= required_karbonite && this.fuel >= required_fuel){
                    this.log('building a PROPHET at ' + (this.me.x+build_x) + ',' + (this.me.y+build_y));
                    return this.buildUnit(SPECS.PROPHET, build_x, build_y);
                }
            }
            else{
                // create Pilgrim
                const required_karbonite = SPECS['UNITS'][SPECS['PREACHER']]['CONSTRUCTION_KARBONITE']
                const required_fuel = SPECS['UNITS'][SPECS['PREACHER']]['CONSTRUCTION_FUEL']
                this.log(required_karbonite + ' ' + required_fuel)
                if(this.karbonite >= required_karbonite && this.fuel >= required_fuel){
                    this.log('building a PREACHER at ' + (this.me.x+build_x) + ',' + (this.me.y+build_y));
                    return this.buildUnit(SPECS.PREACHER, build_x, build_y);
                }
            }

        }

    }
}