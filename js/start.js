'use strict';

//var vConsole = new VConsole();

let obniz;
var motor_right;
var motor_left;
var power_left_sign;
var power_right_sign;
var camera_image;
var button_pressed = false;

const COOKIE_EXPIRE = 365;
const POWER_MARGIN = 10;
const POWER_MAX = 40;
const TIMER_COUNT = 60.0;
const SHELL_COUNT = 10;
const AIMING_DURATION = 0.2;

var vue_options = {
    el: "#top",
    data: {
        progress_title: '',

        obniz_id: '',
        obniz_connected: false,
        power_left: 0,
        power_right: 0,
        power_max: POWER_MAX + POWER_MARGIN,
        power_min: -(POWER_MAX + POWER_MARGIN),
        camera_ipaddress: '192.168.1.248',
        camera_resolution: 4,
        qrcode_context: null,
        qrcode_canvas: null,
        qrcode_list: [],
        enemy_list: new Map(),
        enemy_image: [],
        qrcode: '',
        counter: 0.0,
        num_of_fail: 0,
        num_of_total: 0,
        shells: 0,
        lockon: false,
        audio: null,
        rest_counter : 0,
        aiming_x: 0,
        aiming_y: 0,
        direction: {},
    },
    computed: {
    },
    methods: {
        battle_fire: function(){
            console.log('fire');
            if( this.shells <= 0 )
                return;
            
            this.shells--;
            var fire = $('#snd_fire')[0];
            fire.pause();
            fire.currentTime = 0;
            fire.play();
            if( this.lockon ){
                if( this.qrcode.toLowerCase().endsWith('.mp3') ){
                    console.log("fail");
                    this.num_of_fail++;
                    setTimeout(() => {
                        var audioElem = new Audio();
                        audioElem.src = this.qrcode;
                        audioElem.play();
                    }, 500 );
                    return;
                }
                
                this.qrcode_list.push(this.qrcode);
                var img = this.enemy_list.get(this.qrcode);
                if( img )
                    img.count++;
                setTimeout(() => {
                    var bomb = $('#snd_bomb')[0];
                    bomb.pause();
                    bomb.currentTime = 0;
                    bomb.play();
                }, 700 );
            }
            if( this.shells <= 0 ){
	            this.counter = 0;
	        }
        },
        battle_start: function(){
            this.counter = TIMER_COUNT;
            this.shells = SHELL_COUNT;
            this.num_of_fail = 0;
            this.direction = {},
            this.aiming_x = 0;
            this.aiming_y = 0;
            this.qrcode_list = [];
            this.enemy_image = [];
            this.enemy_list.forEach(item => item.count = 0);
            this.lockon = false;
            this.qrcode = null;
            this.rest_counter = 0;
            this.timer = setInterval(() =>{
                this.counter -= 0.1;
                if( this.counter <= 0.0){
                    clearInterval(this.timer);
                    this.counter = 0.0;
                    this.motor_reset();

                    this.num_of_total = this.qrcode_list.length - this.num_of_fail * 3;
                    if( this.num_of_total < 0)
                        this.num_of_total = 0;
//                    alert('終了ーっ！！');
                    this.enemy_list.forEach((item, key) => {
                        if( item.count > 0 )
                            this.enemy_image.push(key);
                    });
                   this.dialog_open('#result_dialog', true);
                }
            }, 100);
        },
        check_direction: function(gamepad){
            var direction = {};
            if( !this.direction.prev ){
                this.direction.prev = performance.now();
                return direction;
            }
            var now = performance.now();
            direction.diff = now - this.direction.prev;
            this.direction.prev = now;

            if( gamepad.buttons[12].pressed ){
                if( this.direction.up )
                    direction.up = true;
                else
                    this.direction.up = true;
            }else{
                this.direction.up = false;
            }
            if( gamepad.buttons[13].pressed ){
                if( this.direction.down )
                    direction.down = true;
                else
                    this.direction.down = true;
            }else{
                this.direction.down = false;
            }
            if( gamepad.buttons[14].pressed ){
                if( this.direction.left )
                    direction.left = true;
                else
                    this.direction.left = true;
            }else{
                this.direction.left = false;
            }
            if( gamepad.buttons[15].pressed ){
                if( this.direction.right )
                    direction.right = true;
                else
                    this.direction.right = true;
            }else{
                this.direction.right = false;
            }

            return direction;
        },
        check_gamepad: function(playing){
            var gamepadList = navigator.getGamepads();
            for(var i=0; i<gamepadList.length; i++){
                var gamepad = gamepadList[i];
                if(gamepad){
                    if( playing ){
                        this.power_right = Math.floor(-gamepad.axes[3] * this.power_max);
                        this.power_left = Math.floor(-gamepad.axes[1] * this.power_max);
                        this.motor_change_right();
                        this.motor_change_left();

                        if( !button_pressed && gamepad.buttons[0].pressed ){
                            button_pressed = true;
                            this.battle_fire();
                        }else if( button_pressed && !gamepad.buttons[0].pressed ){
                            button_pressed = false;
                        }

                        var direction = this.check_direction(gamepad);
//                        console.log(direction);
                        if( direction.up )
                            this.aiming_y -= direction.diff * AIMING_DURATION;
                        if( direction.down )
                            this.aiming_y += direction.diff * AIMING_DURATION;
                        if( direction.left )
                            this.aiming_x -= direction.diff * AIMING_DURATION;
                        if( direction.right )
                            this.aiming_x += direction.diff * AIMING_DURATION;

                        if( this.aiming_x > this.qrcode_canvas.width)
                            this.aiming_x = this.qrcode_canvas.width;
                        else if( this.aiming_x < 0 )
                            this.aiming_x = 0;
                        if( this.aiming_y > this.qrcode_canvas.height)
                            this.aiming_y = this.qrcode_canvas.height;
                        else if( this.aiming_y < 0 )
                            this.aiming_y = 0;

                        this.qrcode_context.beginPath();
                        this.qrcode_context.arc(this.aiming_x, this.aiming_y, 10, 0 * Math.PI / 180, 360 * Math.PI / 180);
                        this.qrcode_context.closePath();
                        this.qrcode_context.stroke();
                    }else{
                        if( gamepad.buttons[9].pressed )
                            this.battle_start();
                        if( gamepad.buttons[1].pressed )
                            this.dialog_close('#result_dialog');
                    }

                    break;
                }
            }
        },
        camera_draw() {
            if(this.qrcode_canvas == null ){
//                this.qrcode_canvas = document.createElement('canvas');
                this.qrcode_canvas = $('#camera_canvas')[0];
                this.qrcode_canvas.width = camera_image.width;
                this.qrcode_canvas.height = camera_image.height;
                this.qrcode_context = this.qrcode_canvas.getContext('2d');
                this.qrcode_context.strokeStyle = "blue";
                this.qrcode_context.lineWidth = 3;
            }

            this.qrcode_context.drawImage(camera_image, 0, 0, this.qrcode_canvas.width, this.qrcode_canvas.height);

            if( this.counter > 0.0 ){
                const imageData = this.qrcode_context.getImageData(0, 0, this.qrcode_canvas.width, this.qrcode_canvas.height);
                const code = jsQR(imageData.data, this.qrcode_canvas.width, this.qrcode_canvas.height);
                if( code && code.data != "" ){
                    console.log(code);
                    if( this.qrcode_list.indexOf(code.data) < 0){
                        this.qrcode = code.data;

                        var pos = code.location;
                        this.qrcode_context.beginPath();
                        this.qrcode_context.moveTo(pos.topLeftCorner.x, pos.topLeftCorner.y);
                        this.qrcode_context.lineTo(pos.topRightCorner.x, pos.topRightCorner.y);
                        this.qrcode_context.lineTo(pos.bottomRightCorner.x, pos.bottomRightCorner.y);
                        this.qrcode_context.lineTo(pos.bottomLeftCorner.x, pos.bottomLeftCorner.y);
                        this.qrcode_context.lineTo(pos.topLeftCorner.x, pos.topLeftCorner.y);
                        this.qrcode_context.closePath();
                        if( this.qrcode_context.isPointInPath(this.aiming_x, this.aiming_y) ){
                            this.lockon = true;
                            this.qrcode_context.stroke();
                        }else{
                            this.lockon = false;
                        }

                        if( this.qrcode.toLowerCase().endsWith('.png') ){
                            var img = this.enemy_list.get(this.qrcode);
                            if( !img ){
                                var image = new Image();
                                image.crossOrigin = "Anonymous";
                                image.src = this.qrcode;
                                img = { image: image, count: 0 };
                                this.enemy_list.set(this.qrcode, img );
                            };
                            drawTexture(this.qrcode_context, img.image, [pos.topLeftCorner, pos.topRightCorner, pos.bottomRightCorner, pos.bottomLeftCorner]);
                        }else if( this.qrcode.toLowerCase().endsWith('.mp3') ){
                            if( this.audio == null ){
                                this.audio = new Audio();
                                this.audio.addEventListener("ended", () => this.audio = null, false);
                                this.audio.src = this.qrcode;
                                this.audio.play();
                            }
                        }
                    }else{
                        this.lockon = false;
                        this.qrcode = null;
                    }
                }else{
                    this.lockon = false;
                    this.qrcode = null;
                }

                this.check_gamepad(true);
            }else{
                this.check_gamepad(false);
            }

            requestAnimationFrame(this.camera_draw);
        },
        obniz_connect: function(){
            obniz = new Obniz(this.obniz_id);
            this.progress_open('接続試行中です。', true);

            obniz.onconnect = async () => {
                this.progress_close();
                Cookies.set('obniz_id', this.obniz_id, { expires: COOKIE_EXPIRE });
                this.obniz_connected = true;

                motor_left = obniz.wired("DCMotor", {forward:0, back:1});
                motor_right = obniz.wired("DCMotor", {forward:2, back:3});
                this.motor_reset();

                try{
                    await do_get('http://' + this.camera_ipaddress + ':80/control', { var: 'framesize', val: this.camera_resolution });
                }catch(error){
                    alert(error);
                }

                setTimeout(() => {
                    camera_image = new Image();
                    camera_image.crossOrigin = "Anonymous";
//                    camera_image.addEventListener("load", this.camera_draw, false);
                    camera_image.onload = this.camera_draw;
                    camera_image.src = 'http://' + this.camera_ipaddress + ':81/stream';
                }, 1000);
            }
        },
        motor_reset: function(){
            if( this.obniz_connected ){
                motor_right.power(0);
                motor_right.move(true);
                motor_left.power(0);
                motor_left.move(true);
            }

            power_right_sign = 0;
            this.power_right = 0;
            power_left_sign = 0;
            this.power_left = 0;
        },
        motor_change_right: function(){
            if( !this.obniz_connected ){
                this.power_right = 0;
                return;
            }

            var sign = Math.sign(this.power_right);
            var power = Math.abs(this.power_right);
            if( power <= POWER_MARGIN )
                power = 0;
            else
                power -= POWER_MARGIN;

            motor_right.power(power);
            if( sign != power_right_sign ){
                motor_right.move(sign >= 0);
                power_right_sign = sign;
            }
        },
        motor_change_left: function(){
            if( !this.obniz_connected ){
                this.power_left = 0;
                return;
            }

            var sign = Math.sign(this.power_left);
            var power = Math.abs(this.power_left);
            if( power <= POWER_MARGIN )
                power = 0;
            else
                power -= POWER_MARGIN;

            motor_left.power(power);
            if( sign != power_left_sign ){
                motor_left.move(sign >= 0);
                power_left_sign = sign;
            }
        },
        motor_end_right: function(){
            if( !this.obniz_connected ){
                this.power_right = 0;
                return;
            }

            motor_right.power(0);
            motor_right.move(true);
            power_right_sign = 0;
            this.power_right = 0;
        },
        motor_end_left: function(){
            if( !this.obniz_connected ){
                this.power_left = 0;
                return;
            }
            motor_left.power(0);
            motor_left.move(true);
            power_left_sign = 0;
            this.power_left = 0;
        },
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        this.obniz_id = Cookies.get('obniz_id');
    }
};
vue_add_methods(vue_options, methods_utils);
var vue = new Vue( vue_options );

function do_get(url, qs) {
    var params = new URLSearchParams(qs);
    var url2 = new URL(url);
    url2.search = params;
  
    return fetch(url2.toString(), {
		method: 'GET',
	})
	.then((response) => {
		if (!response.ok)
			throw 'status is not 200';
	});
}

function drawTexture(g, img, plsttx){
    try{
        g.save();

        var imgw = img.width;
        var imgh = img.height;

        var m11 = (plsttx[1].x - plsttx[0].x) / imgw;
        var m12 = (plsttx[1].y - plsttx[0].y) / imgw;
        var m21 = (plsttx[3].x - plsttx[0].x) / imgh;
        var m22 = (plsttx[3].y - plsttx[0].y) / imgh;
        var dx = plsttx[0].x;
        var dy = plsttx[0].y;

        g.beginPath();
        g.moveTo(plsttx[0].x, plsttx[0].y);
        g.lineTo(plsttx[1].x, plsttx[1].y);
        g.lineTo(plsttx[3].x, plsttx[3].y);
        g.closePath();
        g.clip();
        g.setTransform(m11, m12, m21, m22, dx, dy);
        g.drawImage(img, 0, 0);
        g.restore();
    
        m11 = (plsttx[2].x - plsttx[3].x) / imgw;
        m12 = (plsttx[2].y - plsttx[3].y) / imgw;
        m21 = (plsttx[2].x - plsttx[1].x) / imgh;
        m22 = (plsttx[2].y - plsttx[1].y) / imgh;
        dx = plsttx[1].x - imgw * m11;
        dy = plsttx[3].y - imgh * m22;
    
        g.save();
        g.beginPath();
        g.moveTo(plsttx[1].x, plsttx[1].y);
        g.lineTo(plsttx[2].x, plsttx[2].y);
        g.lineTo(plsttx[3].x, plsttx[3].y);
        g.closePath();
        g.clip();
        g.setTransform(m11, m12, m21, m22, dx, dy);
        g.drawImage(img, 0, 0);
        g.restore();
    }catch(error){
        console.log(error);
        g.restore();
    }
}