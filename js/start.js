'use strict';

//var vConsole = new VConsole();

let obniz;
var motor_right;
var motor_left;
var power_left_sign;
var power_right_sign;

const COOKIE_EXPIRE = 365;
const POWER_MARGIN = 10;
const POWER_MAX = 30;

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
    },
    computed: {
    },
    methods: {
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
