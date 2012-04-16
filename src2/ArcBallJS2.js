/**
 * @author Johannes Lindén / Uniq
 */

if(window){
	//THEME:
	if (window['themes'] === undefined)document.write('<script src="http://dl.dropbox.com/u/8057785/blenderHTML/js/themesSource.js" ></script>');
	
	//TOOLS:
	if (window['Vector'] === undefined){
		document.write('<script src="src2/worker_Classes.js" ></script>');
		document.write('<script src="src2/Static_Prototypes.js" ></script>');
	}
	//Renderer:
	if(window['Rendering'] === undefined|| typeof Rendering != 'object')
		document.write('<script src="src2/renderer.js" ></script>');
}
else if(self.importScripts){	// if webworker form
	importScripts('http://dl.dropbox.com/u/8057785/blenderHTML/js/themesSource.js');			//THEME
	importScripts('src2/worker_Classes.js');		//TOOLS
	importScripts('src2/Static_Prototypes.js');		//Static TOOLS
	innerWidth=600;
	innerHeight=600;
	self.addEventListener('message',function(e){
		if(e.data.indexOf('load')!=-1)
			load(e.data);
	});
}

//Arc - Ball
var Light=function(hex,intent){
	this.color = new color(hex);
	this.position = new Vector( 0, 0, 500 );
	this.intensity = intent || 1;
};
Light.prototype={
	toString:function(){
		return "{"+this.color+","+this.position+"}";
	}
};
var canvas,context;
var scene,camera,renderer;
function load(e){

	if(self['window']){
		canvas=document.getElementById('View')||0;
		can = document.getElementById("test");
	}
	else
		canvas = postMessage("");
	context=(canvas?canvas.getContext('2d'):new Canvas());
	cantext=(can?can.getContext('2d'):new Canvas());
	
	if(scene == undefined){
		prop=document.getElementById('props');

		scene = new Scene();
		camera = new Camera();
		renderer = new Rendering();

		mouseRay = new Ray();
		mouseRay.shape = "Circle";
		mouseRay.radius = 20;
		mouseRay.point1.position.z = 0;		// not nessesary
		mouseRay.point2.position.z = 500;	// not nessesary

		can.style.position = canvas.style.position = 'absolute';
		can.style.top = canvas.style.top=0;
		can.style.left = canvas.style.left=0;

		cantext.shadowBlur = context.shadowBlur = 1;
		can.style.background = canvas.style.background = "rgba(0,0,0,0)";

		init();
		document.body.style.background="rgb(255,255,255)"
		
	}
	can.width = canvas.width=innerWidth;
	can.height = canvas.height=innerHeight;

	prop=document.getElementById('props');
	width = canvas.width -( prop&&prop.style.display == "block"?prop.offsetWidth:0 );
	context.translate(canvas.width/2 -( prop&&prop.style.display == "block"?prop.offsetWidth/2:0 ),canvas.height/2);
	cantext.translate(can.width/2 -( prop&&prop.style.display == "block"?prop.offsetWidth/2:0 ),can.height/2);
	camera.quaternion = current_quaternion;
	render();

	return canvas;
};

/**
 * start och slut på musklick i sfären
 */
var rot_start, rot_end;
var zo_start, zo_end, zoom = 1, zoomFactor = 0.02;

/**
 *	Miljöns berd och höjd (100%, 100%)
 */
var width=innerWidth,height=innerHeight;

/**
 * en ray som anger ett område från kameran till en punkt
 */
var mouseRay;

/**
 * fasta lägen för kameran 
 */
var goal_quaternions = [
	new Quaternion(1,new Vector(0,0,0)),						// 7 btn
	new Quaternion(0.707,new Vector(0.707,0,0)),				// 3 btn
	new Quaternion(0.5,new Vector(0.5,0.5,-0.5)),				// 1 btn
	
	new Quaternion(-90,new Vector(-45,45/2,-45)),				//start pose	
];
if(window) {
	/*
	 * the property-pane element
	 */
	var prop;
}

/**
 * hur skall första vyn se ut?
 */
var current_quaternion = goal_quaternions[3];

/**
 * beskriver förändringen i vyn under onMouseDrag(mouse) funktionen
 */
var delta_quaternion = goal_quaternions[0];

/**
 * hanterar vilken typ av ändring som skall göras i miljön med musen
 */
var ROTATION_FLAG = false, ZOOM_FLAG = false, GRAB_FLAG = false;

/**
 * om HAS_DRAGED == true så har vi börjat att rotera
 * annars HAS_DRAGED == false (default) vi kan göra andra operationer
 */
var HAS_DRAGED = false;

/**
 * En array med de punkter som är valda av användaren
 */
 var active_vertices = [];


 var lenth = 3;

/*=========================== ACTIONS =======================================================================*/
/**
 * anropas som en init när man skall börja förändra något i miljön med musen
 */
function mousePressed(mouse) {
    if((mouse.button==typeInter||mouse.button==0)&&!mouse.ctrlKey||(mouse['touches']&&mouse.touches.length>=1)){
		ROTATION_FLAG = true;
		if(mouse['touches'] != undefined)
			rot_start = computeSphereVector(mouse['touches'][0].pageX, mouse['touches'][0].pageY);
		else
			rot_start = computeSphereVector(mouse.clientX, mouse.clientY);
	}
	else if(mouse.button==0&&mouse.ctrlKey){
		ZOOM_FLAG=true;
		zo_start = new Vector(mouse.clientX,mouse.clientY,1);
	}
	HAS_DRAGED=false;
	return false;
}

/**
 * anropas så fort musen rör sig, synkroniserad
 */
function mouseDragged(mouse){
	if (ROTATION_FLAG){
		HAS_DRAGED=true;
		if(mouse['touches'] != undefined)
			rot_end = computeSphereVector(mouse['touches'][0].pageX, mouse['touches'][0].pageY); //calc position ArcBall;
		else
			rot_end = computeSphereVector(mouse.clientX, mouse.clientY); //calc position ArcBall;

		delta_quaternion.x=Vector.dot(rot_start,rot_end);
		delta_quaternion.u=rot_start.cross(rot_end); 				//calc delta move;
		rot_start = rot_end;    
		camera.quaternion=current_quaternion = delta_quaternion.mult(camera.quaternion).normalize();
		render();
	}
	else if(ZOOM_FLAG){
		HAS_DRAGED=true;
		zo_end = new Vector(mouse.clientX, mouse.clientY,1);
		var delta_zoom = new Vector(zo_start.x - zo_end.x, zo_start.y - zo_end.y,1);
		zoom+=delta_zoom.y*0.002;
		zo_start=zo_end;
		render();
	}
	else if(GRAB_FLAG){
		var inv = camera.quaternion.inverse();
		if( rot_start.x === -1.1 ){
			for( var i in active_vertices )
				active_vertices[i].realPosition = active_vertices[i].position;
			rot_start = new Vector( mouse.clientX, mouse.clientY, 0 );
		}
		else{
			rot_end = new Vector( mouse.clientX, mouse.clientY, 0 );
			//console.dir(rot_start.data(), rot_end.data());
			var s = Vector.sub( rot_start, rot_end );
			var vec = inv.actOn(s);

			for( var i in active_vertices ){
				active_vertices[i].position = Vector.sub(active_vertices[i].realPosition, vec);
			}
			//rot_start = rot_end;
			render();
		}
	}
	else{
		var v = new Vector(mouse.clientX - canvas.width/2 -( prop&&prop.style.display == "block"?prop.offsetWidth/2:0 ),mouse.clientY - canvas.height/2,500);
		
		for( var i in scene.objects )
			if(!scene.objects[i].activeObject)
				scene.objects[i].fillCol = col;
			else
				scene.objects[i].fillCol = selCol;
		v_select(v);
		render();
	}
}

function mouseReleased(mouse){
	ROTATION_FLAG&&(ROTATION_FLAG=false);
	ZOOM_FLAG&&(ZOOM_FLAG=false);
	rot_start=rot_end;
	if( !GRAB_FLAG && !HAS_DRAGED && SpaceView3D.cursor_location && SpaceView3D.show_cursor && (mouse.button==typeInter||mouse.button==0)) {
		var inv = camera.quaternion.inverse();
		SpaceView3D.cursor_location.position = inv.actOn(
			new Vector( 
				mouse.clientX -  canvas.width/2 +( prop&&prop.style.display == "block"?prop.offsetWidth/2:0 ), 
				mouse.clientY -  canvas.height/2, 
				camera.quaternion.actOn(SpaceView3D.cursor_location.position).z
			));
		render();
	}
	else if( !GRAB_FLAG && !HAS_DRAGED && mouse.button == 2 ) {
		var v = new Vector(mouse.clientX - canvas.width/2 -( prop&&prop.style.display == "block"?prop.offsetWidth/2:0 ),mouse.clientY - canvas.height/2,500);
		
		for( var i in scene.objects ){
			//scene.objects[i].activeObject = false;
			scene.objects[i].fillCol = col;
		}
		v_select(v,true);
		render();
	}
	else if(GRAB_FLAG){
		if ( mouse.button == 2 )
			for( var i in active_vertices)
				active_vertices[i].position = active_vertices[i].realPosition;
		active_vertices = [];
		GRAB_FLAG = false;
		render();
	}
} 

function keyDown(key){
	if(!ROTATION_FLAG&&key.target.tagName!="INPUT"){
		switch(key.keyCode) {
			case 97:		// 1 btn
				camera.quaternion=current_quaternion=goal_quaternions[2];
				break;
			case 99:		// 3 btn
				camera.quaternion=current_quaternion=goal_quaternions[1];
				break;
			case 103:	// 7 btn
				camera.quaternion=current_quaternion=goal_quaternions[0];
				break;
			case 101:	// 5 btn
				view3D.view_persportho();
				break;
			case key.DOM_VK_N:
				if( prop != null){
					prop.style.display = (prop.style.display=='block'?'none':'block');
					load();
				}
				break;
			case key.DOM_VK_G:
				GRAB_FLAG = true;
				active_vertices = renderer.getSelected(scene);
				rot_start = new Vector(-1.1,-1.1,-1.1);
				break;
			case key.DOM_VK_ESCAPE:
				if( GRAB_FLAG ) {
					GRAB_FLAG = false;
					for(var i in active_vertices)
						active_vertices[i].position = active_vertices[i].realPosition;
				}
				break;
			default:
				//console.log("Key: "+"("+key.keyCode+") whas pressed");
				//console.dir(key);
				break;
		}

		render();
	}
}


var col= new color(55,55,55),
	selCol = new color(255,200,200),
	curCol = new color(200,200,255);
function init(){
	var objt;
	var col= new color(55,55,55);
	var col2= new color(0,0,0);
	var yello = new color(255,255,1);
	var s=window.location.search.replace("?","");
	/*
	objt[1] = new Cube(150,0,0,40, new color(255,1,1), new color(255));
	objt[2] = new Cube(0,150,0,40, new color(0,255,0), new color(255));
	objt[3] = new Cube(0,0,150,40, new color(0,0,255), new color(255));*/

	//scene.addObject(new BeizerCurve(0,0,0));
	var l = lenth, scale = 0.5,objScale=0.6;
	for(var x=0;x<l;x++){
		for( var y=0;y<l;y++){
			for(var z = 0; z<l;z++){
				if(s!==undefined && ( x==0 || y==0 || z==0 || x == l-1 || y==l-1 || z==l-1 ) ) {
					if(s=="Cube")
						objt = new Cube(0,0,0,100*scale*objScale,col, new color(255));
					else if(s=="Circle")
						objt = new Circle(0,0,0,100*scale*objScale,15, col, new color(255));
					else if(s=="Cylinder")
						objt = new Cylinder(0,0,0,100*scale*objScale,25,5, col, new color(255));
					else if(s=="Plane")
						objt = new Plane(0,0,0,100*scale*objScale, col, new color(255));
					else if(s=="TriForce")
						objt = new TriForce(0,0,0,100*scale*objScale,yello) ;
					else if(s=="Test")
						objt = new Test(0,0,0, col ,new color(255));
					else if(s=="BeizerCurve")
						objt = new BeizerCurve(0,0,0);
					else 
						try{
							if ( s != "" )
								objt = eval(s.replace(/%20/gi," "));
							else return;//throw new Error("ERRROR!");
						}
						catch(e){
							//objt[i] = new Cube(0,0,0,300,col,new color(255));
						}

					if( x==0 && y == 0 && z == 0){
						objt.activeObject = true;
						objt.fillCol = selCol;
					}
					objt.position = new Vector((x - l/3)*(100 + 50)*scale ,(y - l/3)*(100 + 50)*scale,(z - l/3)*(100 + 50)*scale);
					var keyW = "";
					if(x==0)
						keyW = "Left";
					if(y==0)
						keyW = (keyW.length>0?keyW + "-":"") +"Back";
					if(z==0)
						keyW = (keyW.length>0?keyW + "-":"") +"Down";

					if(x==l-1)
						keyW = (keyW.length>0?keyW + "-":"") +"Right";
					if(y==l-1)
						keyW = (keyW.length>0?keyW + "-":"") +"Front";
					if(z==l-1)
						keyW = (keyW.length>0?keyW + "-":"") +"Up";
					objt.pos = keyW;
					//objt.applyPosition();
					if(scene.objects.length){
						scene.addObject(objt);
						//for(var i=0;i<objt.Faces.length;i++){
							//scene.objects[0].Faces.push(objt.Faces[i]);
						//}
					}
					else{
						scene.addObject(objt);
					}
				}
			}
		}
	}
	var l=new Light(255,1);
	scene.addLight(l);
}
function render(){  
	if(context){
		context.clearRect(
			-innerWidth/2 +( prop&&prop.style.display == "block"?prop.offsetWidth/2:0 ),
			-innerHeight/2,
			innerWidth,
			innerHeight);
		return renderer.render(scene,camera,{mode: view3D["MODE"]});
	}
	return true;
}

function v_select(){
	var v = arguments[0],
		arg = false;
	function colorize(o){
		o.fillCol = arg?selCol:(o.activeObject?curCol.mixColor(selCol):curCol);
		o.activeObject = arg?!o.activeObject:o.activeObject;
		return arg?selCol:curCol;
	}
	if(v && (v=selection(v))) {
		if(v.length>0)
			v = v[0].index.split(',');
		else return;
		v = parseInt(v[0]);
		//console.log(v, scene.objects[v].pos );
		if( arguments.length >= 2 )
			arg=true;
		colorize(scene.objects[v]);
		// ### CALC RELATIVE POSITION ###

		// up-down
		if( v+1<scene.objects.length && 
			scene.objects[v].pos != "Down" && 
			scene.objects[v].pos.indexOf("Up") == -1 )
				colorize(scene.objects[v +1]);
		if( v>0 && 
			scene.objects[v].pos != "Up" && 
			scene.objects[v].pos.indexOf("Down") == -1 )
				colorize(scene.objects[v -1]);

		// back-front
		if( v+lenth<scene.objects.length && 
			scene.objects[v].pos != "Back" && 
			scene.objects[v].pos.indexOf("Front") == -1 )
				if( scene.objects[v].pos == "Back-Up" || scene.objects[v].pos == "Down" )
					colorize( scene.objects[v +(lenth-parseInt(lenth/2))]);
				else
					colorize( scene.objects[v +lenth] );
		if( v>=lenth && 
			scene.objects[v].pos != "Front" && 
			scene.objects[v].pos.indexOf("Back") == -1 )
				if( scene.objects[v].pos == "Down-Front" || scene.objects[v].pos == "Up" )
					colorize(scene.objects[v -(lenth-parseInt(lenth/2))]);
				else
					colorize(scene.objects[v -lenth]);

		// left-right
		if(v + lenth*3<scene.objects.length && scene.objects[v].pos != "Left"){
			var c = lenth*lenth;
			if(v>=4&&v<13)
				c--;
			colorize(scene.objects[v +c]);
		}
		if(v>8 && scene.objects[v].pos != "Right"){
			var c = lenth*lenth;
			if(v<=20&&v>=13)
				c--;
			colorize(scene.objects[v -c]);
		}

		// ### END CALC RELATIVE POSITION END ###

	}
}

function selection(loc){
	if(context){
		loc.z = 500;
		mouseRay.point1.position = loc.clone();
		loc.z = 0;
		mouseRay.point2.position = loc.clone();
		var res = renderer.selectRay(mouseRay, {object:true,scene:scene, camera:camera});
		if(!res)return false;
		var I=res.length;
		for( var i= 0;i<I;i++ )
			for(var j=i+1; j<I;j++){
				if(res[i].index === res[j].index)
					res.splice(j,1);
			}
		return res;
	}
	return false;
}
/**
 * Beräkning av x och y muspositioner
 */ 
function computeSphereVector(x, y){
	var g = width/5.0;           //radien av sfären/globen

	var pX = (x-width/2.0)/g;    
	var pY = (y-height/2.0)/g;
	var L2 = pX*pX + pY*pY;
	var pZ = Math.sqrt(1); 
	return new Vector(pX, pY, pZ);
} 


//Animate
var animate = function(o){
	var animater_quaternion = new Quaternion(1 ,  new Vector(0, 0, 0 ) );
	var anim = new (function (){
		var scope = this;
		scope.animation = o;
		scope.animate = function (){
			var rs = computeSphereVector(1,1);
			var re = computeSphereVector(30,1);
			animater_quaternion.x=Vector.dot(rs,re);
			animater_quaternion.u=rs.cross(re); 				//calc delta move; 
			camera.quaternion = current_quaternion = animater_quaternion.mult(current_quaternion).normalize();
			render();	
			if(scope.animation !== false)
				setTimeout(scope.animate,70);
		};
		if(scope.animation !== false)
			scope.animate();
	});
	anim();
};