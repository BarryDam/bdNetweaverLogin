/**
 * @requires sapui5 / openUI5.js and jQuery
 */
var bdNetweaverLogin = (function($, window, undefined){

	/**
	 *  Base64 encode / decode
	 *  http://www.webtoolkit.info/
	 */
	var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(r){var t,e,o,a,h,n,c,d="",C=0;for(r=Base64._utf8_encode(r);C<r.length;)t=r.charCodeAt(C++),e=r.charCodeAt(C++),o=r.charCodeAt(C++),a=t>>2,h=(3&t)<<4|e>>4,n=(15&e)<<2|o>>6,c=63&o,isNaN(e)?n=c=64:isNaN(o)&&(c=64),d=d+this._keyStr.charAt(a)+this._keyStr.charAt(h)+this._keyStr.charAt(n)+this._keyStr.charAt(c);return d},decode:function(r){var t,e,o,a,h,n,c,d="",C=0;for(r=r.replace(/[^A-Za-z0-9\+\/\=]/g,"");C<r.length;)a=this._keyStr.indexOf(r.charAt(C++)),h=this._keyStr.indexOf(r.charAt(C++)),n=this._keyStr.indexOf(r.charAt(C++)),c=this._keyStr.indexOf(r.charAt(C++)),t=a<<2|h>>4,e=(15&h)<<4|n>>2,o=(3&n)<<6|c,d+=String.fromCharCode(t),64!=n&&(d+=String.fromCharCode(e)),64!=c&&(d+=String.fromCharCode(o));return d=Base64._utf8_decode(d)},_utf8_encode:function(r){r=r.replace(/\r\n/g,"\n");for(var t="",e=0;e<r.length;e++){var o=r.charCodeAt(e);128>o?t+=String.fromCharCode(o):o>127&&2048>o?(t+=String.fromCharCode(o>>6|192),t+=String.fromCharCode(63&o|128)):(t+=String.fromCharCode(o>>12|224),t+=String.fromCharCode(o>>6&63|128),t+=String.fromCharCode(63&o|128))}return t},_utf8_decode:function(r){for(var t="",e=0,o=c1=c2=0;e<r.length;)o=r.charCodeAt(e),128>o?(t+=String.fromCharCode(o),e++):o>191&&224>o?(c2=r.charCodeAt(e+1),t+=String.fromCharCode((31&o)<<6|63&c2),e+=2):(c2=r.charCodeAt(e+1),c3=r.charCodeAt(e+2),t+=String.fromCharCode((15&o)<<12|(63&c2)<<6|63&c3),e+=3);return t}};
	
	/**
	 * @return {[type]}
	 */
	var bdNetweaverLogin = function(boolPreventLogonInit) {

		var that = this;
		
		/**
		 * class constructor
		 */
		this.init = function() {
			that.localStorage.init();
			that.ajax.init();
			that.user.init();
		};

		this.ShowMessage = function(getStrMessage, getIntDuration) 
		{
			var data = (getIntDuration) ? {duration:getIntDuration} : {} ;
			$.sap.require("sap.m.MessageToast");
			sap.m.MessageToast.show(getStrMessage, data);
		};

		this.ajax = {
			init : function()
			{
				that.ajax.SetHeaders();
				that.ajax.OnSuccess();
				that.ajax.OnError();
			},
			SetHeaders : function() 
			{
				$.ajaxSetup({
					headers: {
						"Authorization" : that.localStorage.GetAuth()
					}
				});
			},
			// check the netweaver login status
			CheckNetweaverStatus : function(getStrLoginStatus) 
			{
				switch(getStrLoginStatus) {
					// User is logged out in netweaver
					case 'Logon' :
						that.user.Logon();
						break;
					// User password needs to be changed in netweaver
					case 'Password' :
						that.ShowMessage('Need to change password of user "'+that.Username+'" in Netweaver', 1000);
						break;
				}
			},
			OnSuccess : function() 
			{
				$(document).ajaxSuccess(function(event, request, settings) {
					that.ajax.CheckNetweaverStatus(request.getResponseHeader("SAPLoginStatus"));
				});
			},
			OnError : function() 
			{
				$(document).ajaxError(function(event, request, settings) {
					switch (request.status) {
						case 0:
							that.ShowMessage('No connection', 1000);
							break;
						case 200:
							that.ajax.CheckNetweaverStatus(request.getResponseHeader("SAPLoginStatus"));
							break;
						case 401:
							that.user.Logon();
							break;
						default:
							that.ShowMessage(request.status + ' - ' + request.statusText, 1000);
							break;
					}
				});
			}
		};

		this.localStorage = {
			UI5storage : null, // set in init
			init : function() 
			{
				$.sap.require('jquery.sap.storage');
				that.localStorage.UI5storage = $.sap.storage($.sap.storage.Type.session);
			},
			// Save Auth to local storage
			SaveAuth : function(getUsername, getPassword) 
			{
				var strAuth = 'Basic ' + Base64.encode(getUsername + ':' + getPassword);
				that.localStorage.RemoveAuth();
				that.localStorage.UI5storage.put('Auth', strAuth);
			},
			// Get Auth from local storage
			GetAuth : function() 
			{
				return that.localStorage.UI5storage.get('Auth');	
			},
			// Remove Auth from local storage
			RemoveAuth : function()
			{
				that.localStorage.UI5storage.remove('Auth');
			}
		};

		this.user = {
			Username : null,
			init : function()
			{
				if (! that.localStorage.GetAuth() && ! boolPreventLogonInit)
					that.user.Logon();
			},
			LoggedIn: function() {
				return that.localStorage.GetAuth();
			},
			// opens a SAPui5 user login dialog
			Logon : function(onLoggedInCallBack) {
				var objUsername = new sap.m.Input(),
					objPassword = new sap.m.Input({
						type : sap.m.InputType.Password
					}),
					objDialog = new sap.m.Dialog({
						title       : 'SAP Authentication',
						type        : sap.m.DialogType.Message,
						// right buttons triggers te login
						leftButton  : new sap.m.Button({
							text: 'Login',
							press: function() {
								if (that.user.Login(objUsername.getValue(), objPassword.getValue())) { 
									objDialog.close();
									if (typeof onLoggedInCallBack == 'function')
										onLoggedInCallBack(that.user.Username);
								}
								/* todo > raise login error on else */
							}
						}),
						// rightButton to Cancel
						rightButton : new sap.m.Button({
							text : 'Cancel',
							press: function() {
								objDialog.close();
							}
						}),
						content : [
							new sap.m.Label({ text: 'Username' }),
							objUsername,
							new sap.m.Label({ text: 'Password' }),
							objPassword
						]
					});
				objDialog.open();
			},
			Login : function(getUsername, getPassword) {
				/* todo > check if login is correct */
				if (true) {
					that.user.Username = getUsername;
					that.localStorage.SaveAuth(getUsername, getPassword);
					that.ajax.SetHeaders();
					return true;
				}
			},
			Logout : function() {
				that.localStorage.RemoveAuth();
				that.ajax.SetHeaders();
				that.ShowMessage(that.user.Username+' logged out.', 1000);
				that.user.Username = null;
			}
		};

		// now exec the initializer
		this.init();
	};
	return bdNetweaverLogin;

})(jQuery, window);