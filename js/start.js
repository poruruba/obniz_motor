'use strict';

//var vConsole = new VConsole();

let obniz;
var motor_right;
var motor_left;
var power_left_sign;
var power_right_sign;
var camera_image;

const COOKIE_EXPIRE = 365;
const POWER_MARGIN = 10;
const POWER_MAX = 40;
const TIMER_COUNT = 60.0;
const SHELL_COUNT = 10;

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
        camera_url: 'http://192.168.1.248:81/stream',
        qrcode_context: null,
        qrcode_canvas: null,
        qrcode_list: [],
        qrcode: '',
        counter: 0.0,
        num_of_fail: 0,
        num_of_total: 0,
        shells: 0,
        lockon: false,
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
                if( this.qrcode.endsWith('.mp3') ){
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
                setTimeout(() => {
                    var bomb = $('#snd_bomb')[0];
                    bomb.pause();
                    bomb.currentTime = 0;
                    bomb.play();
                }, 700 );
            }
        },
        battle_start: function(){
            this.counter = TIMER_COUNT;
            this.shells = SHELL_COUNT;
            this.num_of_fail = 0;
            this.qrcode_list = [];
            this.lockon = false;
            this.qrcode = null;
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
                    this.dialog_open('#result_dialog', true);
                }
            }, 100);
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
                        this.lockon = true;

                        var pos = code.location;
                        this.qrcode_context.beginPath();
                        this.qrcode_context.moveTo(pos.topLeftCorner.x, pos.topLeftCorner.y);
                        this.qrcode_context.lineTo(pos.topRightCorner.x, pos.topRightCorner.y);
                        this.qrcode_context.lineTo(pos.bottomRightCorner.x, pos.bottomRightCorner.y);
                        this.qrcode_context.lineTo(pos.bottomLeftCorner.x, pos.bottomLeftCorner.y);
                        this.qrcode_context.lineTo(pos.topLeftCorner.x, pos.topLeftCorner.y);
                        this.qrcode_context.stroke();
                    }else{
                        this.lockon = false;
                        this.qrcode = null;
                    }
                }else{
                    this.lockon = false;
                    this.qrcode = null;
                }
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

                camera_image = new Image();
                camera_image.crossOrigin = "Anonymous";
                camera_image.addEventListener("load", this.camera_draw, false);
                camera_image.src = this.camera_url;

                motor_left = obniz.wired("DCMotor", {forward:0, back:1});
                motor_right = obniz.wired("DCMotor", {forward:2, back:3});

                this.motor_reset();
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
