/**
   Translation layer around Box2DWeb for webchurch

   Notes:
   1. Should 'global' vars be prefixed? Done here with `p$`
   2. Look again into running worlds - Need a cleaner way to intervene among steps
   3. Look into controllers - way to add forces
**/

/** imports and requires **/
var Box2D = require("box2dweb")

var b2World = Box2D.Dynamics.b2World,
    b2Vec2 = Box2D.Common.Math.b2Vec2,
    b2BodyDef = Box2D.Dynamics.b2BodyDef,
    b2Body = Box2D.Dynamics.b2Body,
    b2Shape = Box2D.Collision.Shapes.b2Shape,
    b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
    b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
    b2CircleShape = Box2D.Collision.Shapes.b2CircleShape

/** parameters **/
var fps = 60;
// use scale for rendering only
// everything else happens in m-space
var scale = 30;                 // 1 meter = 30 pixels

/** variables **/
// with g = 10 and 'sleeping' permitted
var defaultWorld = new b2World(new b2Vec2(0, 60), true);
var bodyDef = new b2BodyDef;
var fixDef = new b2FixtureDef;

/** Helpers **/
function tob2Vec2 (svec) { return new b2Vec2(svec[1], svec[2]) }
function arrayToList (arr, mutate) {
    if (mutate) { arr.push(null) }
    else { arr = arr.concat(null) }
    return arr;
}
function tagArgs(tag, args) {
    var a =  Array.prototype.slice.call(args,0);
    return arrayToList([tag].concat(a));
}

/** Procedures **/
//church world -> box2D world
function tob2World(cWorld) {
    for (var i=0; i<cWorld.length-1; i++) {
        var shapeT = cWorld[i][1];
        var body = cWorld[i][2];
        var fix = cWorld[i][3];

        switch (body[1]) {
        case "static":
            bodyDef.type = b2Body.b2_staticBody; break;
        case "dynamic":
            bodyDef.type = b2Body.b2_dynamicBody; break;
        case "kinematic":
            bodyDef.type = b2Body.b2_kinematicBody; break;
        default:
            console.log("error: unknown entity type!");
        }
        bodyDef.position.x = body[2][1];
        bodyDef.position.y = body[2][2];
        bodyDef.linearVelocity.x = body[3][1];
        bodyDef.linearVelocity.y = body[3][2];
        bodyDef.angularVelocity = body[4];

        switch (shapeT[1]) {
        case "circle":          // only radius from dims
            fixDef.shape = new b2CircleShape(shapeT[2][1]);
            break;
        case "rectangle":
            fixDef.shape = new b2PolygonShape;
            fixDef.shape.SetAsBox(shapeT[2][1], shapeT[2][2]);
            break;
        default:
            console.log("error: unknown shape type!");
        }
        fixDef.density = fix[1];
        fixDef.friction = fix[2];
        fixDef.restitution = fix[3];

        defaultWorld.CreateBody(bodyDef).CreateFixture(fixDef);
    }
    return defaultWorld;
}

// box2D world -> church world
function fromb2World (b2dWorld) {
    var body = b2dWorld.GetBodyList();
    var entities = [];
    while (body) {
        var shapeT;
        switch(body.GetFixtureList().GetShape().GetType()) {
        case b2Shape.e_circleShape:
            var r = body.GetFixtureList().GetShape().GetRadius();
            shapeT = p_46shape2D(p_46circle, p_46dim2D(r, 0));
            break;
        case b2Shape.e_polygonShape:
            var vs = body.GetFixtureList().GetShape().GetVertices();
            shapeT = p_46shape2D(p_46rectangle, p_46dim2D(vs[2].x, vs[2].y));
            break;
        default: console.log("error: unknown shape!");
        }
        var type;
        switch (body.GetType()) {
        case b2Body.b2_staticBody:
            type = "static"; break;
        case b2Body.b2_dynamicBody:
            type = "dynamic"; break;
        case b2Body.b2_kinematicBody:
            type = "kinematic"; break;
        default:
            console.log("error: unknown entity type!");
        }
        var b = p_46body2D(type,
                         p_46pos2D(body.GetPosition().x, body.GetPosition().y),
                         p_46vec2D(body.GetLinearVelocity().x, body.GetLinearVelocity().y),
                         body.GetAngularVelocity());
        var f = p_46fix2D(body.GetFixtureList().GetDensity(),
                        body.GetFixtureList().GetFriction(),
                        body.GetFixtureList().GetRestitution());

        entities.push(p_46entity2D(shapeT,b,f));
        body = body.GetNext();
    }
    return arrayToList(entities);
}

// function clearWorld () {
function clearWorld () {
    var count = defaultWorld.GetBodyCount();
    for (var i=0; i<count; i++) {
        var body = defaultWorld.GetBodyList();
        defaultWorld.DestroyBody(body);
    }
    return defaultWorld;
}

/** Scheme-exposed functions for construction and type-checking **/
// Nominally, one ought to use structs instead of lists, but lists are the only
// datastructures available in webchurch scheme
// http://stackoverflow.com/questions/502366/structs-in-javascript

function matchType (array, type) { return array[0] === type }
function assertType (array, type) { console.assert(array[0] === type) }

global["p_46pos2D"] = function (a,b) { return tagArgs("position", arguments) }
global["p_46vec2D"] = function (a,b) { return tagArgs("vector", arguments) }
global["p_46dim2D"] = function (a,b) { return tagArgs("dimensions", arguments) }
global["p_46x"] = function (v) { return v[1] }
global["p_46y"] = function (v) { return v[2] }

global["p_46circle"] = "circle"
global["p_46rectangle"] = "rectangle"
global["p_46shapeTypes"] = function () { return arrayToList([p_46circle, p_46rectangle]) }
global["p_46shape2D"] = function (shape, dimension) {
    assertType(dimension, "dimensions")
    return tagArgs("shape",arguments)
}

global["p_46staticBody"] = "static"
global["p_46dynamicBody"] = "dynamic"
global["p_46kinematicBody"] = "kinematic"
global["p_46bodyTypes"] = function () {
    return arrayToList([p_46staticBody, p_46dynamicBody, p_46kinematicBody])
}

global["p_46body2D"] = function (type, pos, vel, a_vel) {
    assertType(pos,"position");
    assertType(vel,"vector");
    return tagArgs("body",arguments)
}
global["p_46body2D_type"] = function (body) { return body[1] }
global["p_46body2D_position"] = function (body) { return body[2] }
global["p_46body2D_velocity"] = function (body) { return body[3] }
global["p_46body2D_aVelocity"] = function (body) { return body[4] }

global["p_46fix2D"] = function (den, fric, rest) { return tagArgs("fixture",arguments) }
global["p_46fix2D_density"] = function (fix) { return fix[1] }
global["p_46fix2D_friction"] = function (fix) { return fix[2] }
global["p_46fix2D_restitution"] = function (fix) { return fix[3] }

global["p_46entity2D"] = function (shapeT, body, fix) {
    assertType(shapeT, "shape")
    assertType(body, "body")
    assertType(fix, "fixture")
    return tagArgs("entity", arguments)
}
global["p_46entity2D_shapeT"] = function (entity) { return entity[1] }
global["p_46entity2D_body"] = function (entity) { return entity[2] }
global["p_46entity2D_fixture"] = function (entity) { return entity[3] }
global["p_46entity2D_shape"] = function (entity) { return entity[1][1] }
global["p_46entity2D_dimensions"] = function (entity) { return entity[1][2] }
global["p_46entity2D_type"] = function (entity) { return entity[2][1] }
global["p_46entity2D_position"] = function (entity) { return entity[2][2] }
global["p_46entity2D_velocity"] = function (entity) { return entity[2][3] }
global["p_46entity2D_aVelocity"] = function (entity) { return entity[2][4] }
global["p_46entity2D_density"] = function (entity) { return entity[3][1] }
global["p_46entity2D_friction"] = function (entity) { return entity[3][2] }
global["p_46entity2D_restitution"] = function (entity) { return entity[3][3] }

global["p_46noVelocity"] = function () { return p_46vec2D(0, 0) }
global["p_46stdFixture"] = function () { return p_46fix2D(1.0, 0.2, 0.3)}

global["p_46simpleEntity2D"] = function (shape, dim, type, pos, vel) {
    return p_46entity2D(p_46shape2D(shape,dim),
                      p_46body2D(type, pos, vel, 0.0),
                      p_46stdFixture())
}
// perhaps need a function to read back into scheme that keeps it 'simple'?
// filp(0.1) at this point

global["p_46setWorldG"] = function (gravity) {
    assertType(gravity, "vector")
    defaultWorld.gravity = tob2Vec2(gravity);
}

// consider p_46 prefix
global["runPhysics"] = function(steps, cWorld) {
    clearWorld();
    tob2World(cWorld);
    for (var s=0; s<steps; s++) {
        defaultWorld.Step(
            1 / fps   //frame-rate
            ,  10       //velocity iterations
            ,  10       //position iterations
        );
    }
    return fromb2World(defaultWorld);
}

/** specifically for in-browser running **/
if (typeof window !== 'undefined') {
    var mspf = 1000/fps;
    var lastTime = 0;
    var requestId;

    window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, mspf/2 - (currTime - lastTime));  //run twice as fast...
        var id = window.setTimeout(
            function() { callback(currTime + timeToCall); },
	    timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
    window.cancelAnimationFrame = function(id) {clearTimeout(id)};

    function stopAnim() {
        if (requestId) {
            window.cancelAnimationFrame(requestId);
            requestId = undefined;
        }
    }

    var worldWidth = 350;
    var worldHeight = 500;
    var b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

    // code to run animation in browser
    global["animatePhysics"] = function(steps, cWorld) {
        function simulate(canvas, steps) {
            clearWorld();
            console.log(typeof gravity);
            tob2World(cWorld);
            var debugDraw = new b2DebugDraw();
            debugDraw.SetSprite(canvas[0].getContext("2d"));
            debugDraw.SetDrawScale(1); // was 'scale' before
            debugDraw.SetFillAlpha(0.3);
            debugDraw.SetLineThickness(1.0);
            debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
            defaultWorld.SetDebugDraw(debugDraw);

            function update(stepsSoFar) {
	        stepsSoFar++;
	        var currTime = new Date().getTime();
	        requestId = requestAnimationFrame(function(time) {update(stepsSoFar);});
	        if (stepsSoFar < steps) {
	            defaultWorld.Step(
	                1 / fps,  //frame-rate
	                10,       //velocity iterations
	                10        //position iterations
	            );
	        }
	        defaultWorld.DrawDebugData();
	        defaultWorld.ClearForces();
            };
            requestId = requestAnimationFrame(function() {update(0);});
        }
        disp = function($div) {
            stopAnim(); //stop previous update thread
            setTimeout(stopAnim, mspf); //make sure previous update thread is stopped
            var $physicsDiv = $("<div>").appendTo($div);
            $physicsDiv.append("<br/>");
            var $canvas = $("<canvas/>").appendTo($physicsDiv);
            $canvas.attr("width", worldWidth)
	        .attr("style", "background-color:#333333;")
	        .attr("height", worldHeight);
            $physicsDiv.append("<br/>");
            simulate($canvas, 0);
            var $button = $("<button>Simulate</button>").appendTo($physicsDiv);
            $button.click(function() {
	        stopAnim(); //stop previous update thread..
	        simulate($canvas, steps);
            });
            var $clearButton = $("<button>Delete Animation Window</button>")
            $clearButton.appendTo($physicsDiv);
            $clearButton.click(function() {
	        var count = world.GetBodyCount();
	        for (var i=0; i<count; i++) {
	            var body = world.GetBodyList();
	            world.DestroyBody(body);
	        }
	        $physicsDiv.remove();
            });
            return "";
        };

        sideEffects.push({type: 'function', data: disp});
        return;
    }
}

// TODO: decide if a world ought to be a list of entities with histories
//       or a list of world-steps with entities
