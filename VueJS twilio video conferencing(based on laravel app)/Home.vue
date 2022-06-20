<template>
    <div class="min-vh-100">
        <div class="button-box-header">
            <h1 class="header-text">WELCOME TO SQUIRREL VIDEO CONFERENCE</h1>
        </div>
        <div v-if="!join">
            <div class="button-box">
                <button @click="join = 1">Host A Meeting</button>
                <button @click="join = 2">Join A Meeting</button>
            </div>
        </div>
        <div v-else class="home">
            <div class="row flex-column justify-content-start align-items-center mt-5 m-0 w-auto">
                <div>
                    <div class="text-left w-100 back-button">
                        <span @click.prevent="join = 0"><i class="fa fa-arrow-left"></i> Back</span>
                    </div>
                    <div class="d-flex justify-content-center user-forms">
                        <div class="form-block">
                            <div class="form-content">
                                <img class="logon-logo" :src="squirrelLogo" alt="Squirrel">
                                <h2>Squirrel Login</h2>
                                <p>Please login to continue using our app</p>
                                <form
                                    @submit.prevent="(! joinLoginStep) ? loginToSquirrel(email,password) : createJoinRoom(username)"
                                    class="w-100">
                                    <div class="form-group">
                                        <div v-if="(! joinLoginStep)" class="form-group">
                                            <label for="email">Email</label>
                                            <input
                                                type="text"
                                                class="form-control"
                                                id="email"
                                                v-model="email"
                                                required
                                            />
                                            <label for="password">Password</label>
                                            <input
                                                type="password"
                                                class="form-control"
                                                id="password"
                                                v-model="password"
                                                required
                                            />
                                        </div>
                                        <div v-if="joinLoginStep === 1" class="form-group">
                                            <label for="loginRoomId">Room ID</label>
                                            <input
                                                type="text"
                                                class="form-control"
                                                id="loginRoomId"
                                                v-model="roomId"
                                                required
                                            />
                                            <label for="loginPasscode">Passcode</label>
                                            <input
                                                type="password"
                                                class="form-control"
                                                id="loginPasscode"
                                                v-model="passcode"
                                                required
                                            />
                                        </div>
                                        <div class="d-flex py-2">
                                            <div class="login-options w-100">
                                                <div class="login-checkbox">
                                                    <input type="checkbox" name="rememberMe" id="rememberMe">
                                                    <label id="labelRemember" for="rememberMe">
                                                        Keep me logged in
                                                    </label>
                                                </div>
                                                <a :href="forgotPasswordUrl">
                                                    Forgot password?
                                                </a>
                                            </div>
                                            <hr>
                                        </div>
                                        <button type="submit" class="webBtn">
                                            Join With Squirrel Login <i class="spinner hidden"></i>
                                        </button>
                                    </div>
                                </form>
                            </div>
                            <div class="haveAccount text-center">
                        <span class="margin-right-15">
                            Don't have an account?
                        </span>
                                <a :href="signUpUrl" id="member">
                                    Sign up
                                </a>
                            </div>
                        </div>
                        <div v-if="join === 2" class="form-block">
                            <div class="form-content">
                                <img class="logon-logo" :src="squirrelLogo" alt="Squirrel">
                                <h2>Login As Guest</h2>
                                <p>Please enter your name to join meeting</p>
                                <form @submit.prevent="(! joinStep) ? joinStep = 1 : createJoinRoom(username)"
                                      class="w-100">
                                    <div
                                        v-if="! joinStep"
                                        class="form-group">
                                        <label for="username">Name</label>
                                        <input
                                            type="text"
                                            class="form-control"
                                            id="username"
                                            v-model="username"
                                            required
                                        />
                                    </div>
                                    <div v-if="joinStep === 1" class="form-group">
                                        <label for="room_id">Room ID</label>
                                        <input
                                            type="text"
                                            class="form-control"
                                            id="room_id"
                                            v-model="roomId"
                                            required
                                        />
                                    </div>
                                    <div v-if="joinStep === 1" class="form-group">
                                        <label for="passcode">Passcode</label>
                                        <input
                                            type="password"
                                            class="form-control"
                                            id="passcode"
                                            v-model="passcode"
                                            required
                                        />
                                    </div>
                                    <div v-if="join === 1" class="d-flex align-items-end justify-content-end">
                                        <button type="submit" class="webBtn">
                                            Create a Room
                                        </button>
                                    </div>
                                    <div v-if="join === 2" class="d-flex align-items-end justify-content-end">
                                        <button type="submit" class="webBtn">
                                            Join a Room
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    </div>
</template>

<script>
import Join from './Join';
import roomService from '../services/room';
import squirrelService from '../services/squirrel';

export default {
    name: 'Home',
    components: {
        Join,
    },
    props: {
        id: {
            type: String,
            default: () => '',
        },
        name: {
            type: String,
            default: () => '',
        },
        code: {
            type: String,
            default: () => '',
        },
        mode: {
            type: Number,
            default: () => 0,
        },
        step: {
            type: Number,
            default: () => 0,
        },
        loginStep: {
            type: Number,
            default: () => 0,
        },
    },
    data() {
        return {
            join: this.mode, // 0: default, 1: create, 2: join
            joinStep: this.step,
            joinLoginStep: this.loginStep,
            username: this.name,
            roomId: this.id,
            passcode: this.code,
            email: this.email,
            password: this.password,
            avatar: this.avatar,
            squirrelLogo: '/images/squirrel_logo.png',
        };
    },
    computed: {
        signUpUrl: function () {
            return squirrelUrl + '/signup';
        },
        forgotPasswordUrl: function () {
            return squirrelUrl + '/forgot-password';
        }
    },
    mounted() {
    },
    methods: {
        async createJoinRoom(username) {

            localStorage.setItem('member',
                JSON.stringify({
                    avatar: this.avatar,
                    username: this.username
                })
            );
            if (this.join === 1) {
                const response = await roomService.createRoom({name: username});
                if (response.status === 200) {
                    this.roomId = response.data.roomId;
                    this.passcode = response.data.passcode;

                    this.$router.push({
                        name: 'join',
                        query: {roomId: this.roomId, passcode: this.passcode, join: 1},
                        params: {name: username, avatar: this.avatar},
                    });
                }
            } else {
                this.$router.push({
                    name: 'join',
                    query: {roomId: this.roomId, passcode: this.passcode, join: 2},
                    params: {name: username, avatar: this.avatar},
                });
            }
        },
        async loginToSquirrel(email, password) {
            const response = await squirrelService.login({email: email, password: password});
            if (! response.data) {
                Vue.$toast.open({
                    message: 'Something went wrong!',
                    type: 'error',
                });
                return;
            }
            if (response.data.success) {
                this.username = response.data.member.first_name + ' ' + response.data.member.last_name
                this.avatar = response.data.member.avatar

                if (this.join === 1) {
                    Vue.$toast.open('Login Success!');
                    this.createJoinRoom(this.username)
                } else {
                    Vue.$toast.open('Login Success! </br> Please enter valid Room ID and Passcode to proceed');
                    this.joinLoginStep = 1;
                }
            } else {
                Vue.$toast.open({
                    message: response.data.message,
                    type: 'error',
                })
            }
        }
    },
};
</script>

<style lang="scss">
$sm: 576px;
$md: 768px;
$lg: 1224px;

.back-button {
    color: #2f2f2f;
    padding: 15px;

    span {
        cursor: pointer;
    }
}

.form-block {
    width: 350px;
    padding: 0 15px;
    color: white;
    text-align: left;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    margin-bottom: 15px;

    &:nth-child(2) {
        border-left: 2px solid #4d4d4d;

        @media screen and (max-width: $md) {
            border-left: unset;
            border-top: 2px solid #4d4d4d;
            padding-top: 15px;
        }
    }

    .form-control {
        padding: 10px 15px;
        font-size: 24px;
    }

    .link {
        color: white;
        font-size: 1rem;
        text-decoration: underline;
        margin-right: 15px;
    }

    .form-content {
        background-color: #f2f2f2;
        font-size: 12px;
        padding: 25px 20px 15px;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    label {
        color: #b4b4b4;
    }

    input {
        height: 36px;
        background-color: transparent;
        color: #7b7b7b;
        padding: 10px;
        border: 1px solid #dedbd9;
        font-size: 12px !important;
    }

    .logon-logo {
        width: 150px;
        margin: 10px auto 20px auto;
    }

    h2 {
        text-align: center;
        color: #5a5a5a;
        font-size: 24px;
        font-weight: 500;
    }

    p {
        text-align: center;
        color: #5a5a5a;
        margin: 0 0 10px;
        letter-spacing: 0.2px;
        word-break: break-word;
    }

    .webBtn {
        width: 100%;
        margin-bottom: 10px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 100px;
        height: 42px;
        background: #caa053;
        color: #fff;
        font-size: 14px;
        text-align: center;
        padding: 0 20px 0;
        letter-spacing: 1px;
        white-space: nowrap;
        border: 0;
        border-radius: 7px;
        outline: none !important;
        cursor: pointer;

        &:hover {
            background: #3f3f3f;
            color: #fff !important;
            box-shadow: inset 0 0 0 1px rgb(255 255 255 / 10%);
        }
    }

    .haveAccount {
        font-size: 13px;
        margin: 5px auto 0 auto;
        padding: 7.5px;
        background: rgb(242, 243, 244, 90%);
        border-radius: 10px;

        span {
            color: #2f2f2f;
        }

        a {
            color: #989898;
        }
    }

    .login-options {
        display: flex;
        justify-content: space-between;
        align-items: center;

        #rememberMe {
            border-color: #e3e2e0 !important;
            margin-right: 10px;
            position: relative;
            top: 4px;
            width: 18px;
            min-width: 18px;
            height: 18px;
            display: inline;
            margin-top: 0;
            cursor: pointer;


            &::before {
                content: '';
                top: 8px;
                left: 6px;
                font-size: 12px;
                line-height: 0;
                transform: rotate(40deg);
                z-index: 1;
                color: #989898;
                position: absolute;
                transition: all linear 0.3s;
            }

            &:checked::before {
                content: '\02143'
            }

            &::after {
                position: absolute;
                content: '';
                transition: all linear 0.3s;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                border: 1px solid #e3e2e0;
                border-radius: 2px !important;
                background: #fff;
                color: #989898;
            }
        }

        a {
            color: #989898;
        }
    }

    @media screen and (max-width: $md) {
        width: 300px;
        padding: 0;
    }

    @media screen and (max-width: $sm) {
        min-width: 300px;
        width: 100%;
        padding: 0;
    }
}

.home {
    min-height: 100%;
}

.user-forms {
    @media screen and (max-width: $md) {
        flex-direction: column;
    }
}
</style>
