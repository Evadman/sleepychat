var socket = null;
var isOldTitle = true;
var oldTitle = "Sleepychat - ";
var newTitle = "*** New message! ***";
var interval = null;
var notify = false;
var snd = new Audio("/sounds/notify.ogg");
var soundMesg = false;
var soundMent = true;
var soundJnLv = false;
var soundSite = true;
var denied = false;

//For name list
var users = null;
var sorting = "default";
var adminModsFirst = false;

//For Autocomplete
var tcOptions = {
	minLength: 2
};

//For chat section
var msgFrame = null;
var msgList = null;
var cutoff = 40;
var resizeInt = -1;

//For day/night mode
var isDay = true;

//For name section
var nameList = null;
var nameListWidthInit = 250;
var nameListWidth = nameListWidthInit;
var nameSidebar = true;
var isOnRight = true;

//For cookies!!!
var cookies = [];

//For tokens
var args = window.location.pathname.split('/');
var roomtoken = args[2];
var usertoken = args[3];
oldTitle += (roomtoken == "modroom" ? "Mod Room" : "Private Room");

//For room cleanup
var date = new Date();

//For YouTube Embedding
var apiKey = "NOTLOADED";
var isGapiLoaded = false;
var isYapiLoaded = false;
var youTubeMatcher = /\^~([A-Za-z0-9-_]{11})~\^~(?:([A-Za-z0-9-_]{24}))?~\^?/g; // Matches the video ID between ^~ ~^, and optionally matches the playlist ID between ~ ~^

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

var isConsole = {
    //TV Consoles
    Xbox360: function() {
        return navigator.userAgent.match(/Xbox/i) && !isConsole.XboxOne();
    },
    XboxOne: function() {
        return navigator.userAgent.match(/Xbox One/i);
    },
    PS3: function() {
        return navigator.userAgent.match(/PLAYSTATION 3/i);
    },
    PS4: function() {
        return navigator.userAgent.match(/PlayStation 4/i);
    },
    Wii: function() {
        return navigator.userAgent.match(/Nintendo Wii/i) && !isConsole.WiiU();
    },
    WiiU: function() {
        return navigator.userAgent.match(/Nintendo WiiU/i);
    },
    OUYA: function() {
        return navigator.userAgent.match(/OUYA/i);
    },
    // Handheld Consoles
    NintendoDS: function() {
        return navigator.userAgent.match(/Nintendo (?:3DS|DSi)/i);
    },
    VitaPSP: function() {
        return navigator.userAgent.match(/PlayStation (?:Portable|Vita)/i);
    },
    AnyTV: function() {
        return (isConsole.Xbox360() || isConsole.XboxOne() || isConsole.PS3() || isConsole.PS4() || isConsole.Wii() || isConsole.WiiU() || isConsole.OUYA());
    },
    AnyMobile: function() {
        return (isConsole.NintendoDS() || isConsole.VitaPSP());
    }
};

$(document).ready(function()
{
    msgFrame = $("#msgframe");
    nameList = $("#namelist");
    
    if (!isMobile.any())
    {
        window.onresize = function(event) {

            doResize();
        };
        
        $('#m').focus();
    }
    else
    {
        mobileInitHeight = window.innerHeight;
        nameListWidth = 0;
        nameList.remove();
        nameList = null;
        nameSidebar = false;
    }
    
    msgFrame.css("height", (window.innerHeight-cutoff).toString()+"px");
    msgFrame.css("width", (window.innerWidth-nameListWidth).toString()+"px");
    msgFrame.html("<div class='body'><ul id='messages'></ul></div>");
    msgList = msgFrame.contents().find("ul#messages");
    
    if (nameList != null)
    {
        nameList.css("height", (window.innerHeight-cutoff).toString()+"px");
        nameList.css("width", (nameListWidth).toString()+"px");
    }
    
    // Cookies!!!
    parseCookies();
    
    if (getCookie("sidebar", "right") == "left" && !isMobile.any())
    {
        moveNameList();
    }
    if (getCookie("theme", "day") == "night")
    {
        toggleDayNight();
    }
    sorting = getCookie("sorting", "default");
    adminModsFirst = getCookie("sortadminmodsfirst", "false") == "true";
    
    // Sound setup
    $('#mesg-alerts').click(function () {
        
        soundMesg = this.checked;
        setCookie("soundMesg", soundMesg.toString());
    });
    $('#ment-alerts').click(function () {
        
        soundMent = this.checked;
        setCookie("soundMent", soundMent.toString());
    });
    $('#jnlv-alerts').click(function () {
        
        soundJnLv = this.checked;
        setCookie("soundJnLv", soundJnLv.toString());
    });
    $('#site-alerts').click(function () {
        
        soundSite = this.checked;
        setCookie("soundSite", soundSite.toString());
    });
    setUpSound();
    
	socket = io("/", { reconnection: false, transport: ['websocket'] });
	
	$('#chatbar').unbind('submit');
	$('#chatbar').submit(function()
	{
		return false;
	});
	
	$('#mutebutton').click(function()
	{
		$('#sound-modal').modal({keyboard: true, backdrop: 'true'});
	});

	socket.on('connect', function()
	{
		socket.on('ping', function() {
			
			socket.emit('pong');
		});
		
		var ignore_list = new Array();
		
		$('#chatbar').unbind('submit');
		$('#chatbar').submit(function()
		{
            var msgInBox = $('#m').val();
            
            if (msgInBox == "/dialog")
            {
                $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
            }
			else if (msgInBox == "/help" || msgInBox == "/formatting")
			{
				window.open('/help');
			}
            else if ((msgInBox == "/list" || msgInBox == "/names") && !isMobile.any())
            {
                if (!nameSidebar)
                {
                    replaceNameList();
                }
            }
			else if (msgInBox != "" && !(/^ +$/.test(msgInBox)))
			{
				socket.emit('chat message', { message: msgInBox });
				scrollDown(true);
			}
            
			$('#m').val('');
			return false;
		});
        
        socket.on('allow', function(googleApiKey)
		{
			apiKey = googleApiKey.keyString;
            if (!isYapiLoaded)
            {
                if (isGapiLoaded)
                {
                    youtubeApiLoad();
                }
                else
                {
                    console.log("Warining: Google API Script not yet loaded. Waiting...");
                }
            }
		});
		
		socket.on('denial', function(reason)
		{
			denied = true;
			msgList.append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\">" + "[INFO] Your connection was refused. "+reason+"</span>"));
		});
		
		socket.on('chat message', function(msg, who, userFrom)
		{
			if(msg)
			{
				var scroll_down = isWithinScrollThreshold();
                
                if (youTubeMatcher.test(msg))
                {
                    youTubeMatcher.lastIndex = 0;
                    if (isConsole.Xbox360())
                    {
                        msg = msg.replace(youTubeMatcher, "<div class='yt-video-container yt-loader-container'><div style='vertical-align: middle; text-align: center;'>YouTube Embedding Not Supported on Xbox 360.<br/><a href='http://youtube.com/watch?v=$1'>Link to Video</a></div></div>");
                    }
                    else
                    {
                        var videoId = youTubeMatcher.exec(msg)[1];
                        youTubeMatcher.lastIndex = 0;
                        msg = msg.replace(youTubeMatcher, "<div class='yt-video-container yt-loader-container' videoid='$1'><div style='vertical-align: middle; text-align: center;'>"+(isYapiLoaded ? "Fetching Video Information..." : "YouTube API Not Loaded =/")+"</div></div>");
                        requestYouTubeEmbed(videoId);
                    }
                }
				
				var isMention = false;

				var msgClass = "";
				
				if (userFrom == nick || (who === "eval" && (msg.lastIndexOf('&lt;' + nick + '&gt;', 0) == 0 || msg.lastIndexOf("<span style='font-weight: 300'>*" + nick, 0) == 0)))
				{
					msgClass += 'self';
				}
				else
				{
					if (msg.indexOf("&gt;") != -1)
					{
						if (msg.split('&gt;')[1].substring(1).indexOf(nick) != -1)
						{
							msgClass += (msgClass != "" ? " " : "")+'mention';
							isMention = true;
						}
					}
					else if (msg.indexOf(nick) != -1)
					{
						msgClass += (msgClass != "" ? " " : "")+'mention';
						isMention = true;
					}
				}
				
//				var user = msg.match(/&lt;(.+)&gt;/);
//				if(who === "me")
//				{
//					msgClass+= 'self';
//				}
//				else if(who === "eval" && msg.lastIndexOf('&lt;' + nick + '&gt;', 0) === 0)
//				{
//					msgClass+= 'self';
//				}
//				
//				try
//				{
//					if(msg.split('&gt;')[1].substring(1).indexOf(nick) != -1)
//					{
//						msgClass+= (msgClass != "" ? " " : "")+'mention';
//                        isMention = true;
//					}
//				}
//				catch(e) {}
                
				if (!(userFrom && ignore_list.indexOf(userFrom) != -1))
				{
					msgList.append($('<li class="'+msgClass+'">').html(moment().format('h:mm:ss a') + ": " + msg));
				}
				
				if(notify)
				{
					if (isMention)
                    {
                        if(soundMent)
					       	snd.play();
                    }
                    else
                    {
                        if(soundMesg)
                            snd.play();
                    }
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}
				
				scrollDown(scroll_down);
			}
		});
        
        socket.on('rosterupdate', function(newInfo)
		{
			users = newInfo;
            if (!isMobile.any())
            {
                updateNameList();
				
				var nicks = [];
                for (var i = 0; i < users.length; i++)
                {
                    nicks.push(users[i].nick);
                }
                
                var hadFocus = $("#m").is(":focus")
                $('#m').tabcomplete(nicks, tcOptions);
                if (hadFocus) { $('#m').focus(); }
            }
		});
		
		socket.on('nickupdate', function(newnick)
		{
			nick = newnick;
		});

		socket.on('information', function(msg)
		{
			if(msg)
			{
				if(notify)
				{
					if (msg.indexOf("has joined.") != -1 || msg.indexOf("has left.") != -1 || msg.indexOf("is AFK.") != -1)
                    {
                        if (soundJnLv)
                            snd.play();
                    }
                    else if (msg.indexOf("[COINFLIP]") != -1 || msg.indexOf("ROLL") != -1)
                    {
                        if (soundMesg)
                            snd.play();
                    }
                    else
                    {
                        if (soundSite)
                            snd.play();
                    }
					
					newTitle = "*** New message! ***";
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}
				var scroll_down = isWithinScrollThreshold();
				msgList.append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information"+(msg.indexOf("ROLL") == -1 ? " blocking" : "")+"\">" + msg + "</span>"));
				scrollDown(scroll_down);
			}
		});

		socket.on('ignore', function(user)
		{
			ignore_list.push(user);
		});

		socket.on('disconnect', function()
		{
			if(notify)
			{
				if(soundSite)
					snd.play();
				newTitle = "*** Alert ***";
				clearInterval(interval);
				interval = setInterval(changeTitle, 1000);
			}
            if (!denied)
			{
				msgList.append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information blocking\">" + "[INFO] Sorry! You seem to have been disconnected from the server. Please reload the page to resume chatting.</span>"));
			}
			scrollDown(true);
		});
		
		socket.emit('joinroom', roomtoken, usertoken);
	});

	$(window).blur(function()
	{
		notify = true;
	});

	$(window).focus(function()
	{
		notify = false;
    	clearInterval(interval);
    	$("title").text(oldTitle);
	});

	//binaural beat setup
	var playing = false;
	var prevBeat = null;

	socket.on('binaural', function(BBeat)
	{
		if(!BBeat)
			var BBeat = 7;
			var prevBeat = 7; // If they just did /binaural we want to stop the binaurals if they're playing
		console.log(BBeat)
		var frequency = 65;

		var leftear = (BBeat / 2) + frequency;
		var rightear = frequency - (BBeat / 2);
		if (playing && (prevBeat == BBeat))
		{
			stop();
			playing = false;
		}
		else
		{
			stop();
			SetupBeat(leftear,rightear);
			PlayBeat(BBeat,frequency);
			prevBeat = BBeat
			playing = true;
		}
	});

});

var audiolet = new Audiolet();
var out = audiolet.output;
var sine1,sine2,pan1,pan2,gain;

var SetupBeat = function(leftear,rightear){
	sine1 = new Sine(audiolet, leftear);
	sine2 = new Sine(audiolet, rightear);
	pan1 = new Pan(audiolet, 1);
	pan2 = new Pan(audiolet, 2); 
	gain = new Gain(audiolet, 0.5)
	sine1.connect(pan1);
	sine2.connect(pan2);
}

var PlayBeat = function(beat,frequency){
	beat = parseFloat(beat);
	frequency = parseFloat(frequency);
	var beat = beat / 2;
	var leftear = beat + frequency;
	var rightear = frequency - beat;
	stop();
	SetupBeat(leftear,rightear);
	start();
}

var start = function(){
	pan1.connect(gain);
	pan2.connect(gain);
	gain.connect(out);
}

var stop = function(){
	try
	{
		gain.disconnect(out);
	} catch (e) {}
}

function doResize() {
    
    msgFrame.css("height", (window.innerHeight-cutoff).toString()+"px");
    if (nameList != null)
    {
        nameList.css("height", (window.innerHeight-cutoff).toString()+"px");
    }
    msgFrame.css("width", (window.innerWidth-nameListWidth-32).toString()+"px");
    
    if (resizeInt != -1)
    {
        clearInterval(resizeInt);
    }
    
    resizeInt = setInterval(function() {
        
        msgFrame.css("width", (window.innerWidth-nameListWidth).toString()+"px");
        clearInterval(resizeInt);
        resizeInt = -1;
    }, 100);
}

function isWithinScrollThreshold() {
    
    return (msgFrame.scrollTop() + msgFrame.height() + 300 >= msgFrame[0].scrollHeight);
}

function scrollDown(scroll_down)
{
	if (scroll_down)
	{
		msgFrame.stop(true,true).animate({ scrollTop: msgFrame[0].scrollHeight}, 500);
	}
}

function replaceNameList()
{
	var scroll_down = isWithinScrollThreshold();
    msgFrame.before("<div class='list-"+(isOnRight ? "right" : "left")+"' id='namelist'></div>");
    nameListWidth = nameListWidthInit;
    msgFrame.css("width", (window.innerWidth-nameListWidth).toString()+"px");
    nameList = $("#namelist");
    nameList.css("height", (window.innerHeight-cutoff).toString()+"px");
    nameList.css("width", (nameListWidth).toString()+"px");
    updateNameList();
    nameSidebar = true;
    scrollDown(scroll_down);
}

function removeNameList()
{
    nameListWidth = 0;
    nameList.remove();
    nameList = null;
    msgFrame.css("width", (window.innerWidth-nameListWidth).toString()+"px");
    nameSidebar = false;
}

function moveNameList()
{
    if (isOnRight)
    {
        nameList.removeClass("list-right");
        nameList.addClass("list-left");
    }
    else
    {
        nameList.removeClass("list-left");
        nameList.addClass("list-right");
    }
    isOnRight = !isOnRight;
    updateNameList();
    setCookie("sidebar", (isOnRight ? "right" : "left"));
}

function updateNameList()
{
    if (users != null)
    {
        users.sort(function(a, b) 
        {
            var retVal = 0;
        
            if (sorting == "alpha")
            {
                var nickA=a.nick.toLowerCase(), nickB=b.nick.toLowerCase();
                if(nickA < nickB) retVal = -1;
                if(nickA > nickB) retVal = 1;
            }
        
            if (adminModsFirst)
            {
                if(a.authority.indexOf("mod.png") != -1 && b.authority.indexOf("mod.png") == -1) retVal = -1;
                if(a.authority.indexOf("creator.png") != -1 && b.authority.indexOf("creator.png") == -1) retVal = -1;
                if(a.authority.indexOf("admin.png") != -1 && b.authority.indexOf("admin.png") == -1) retVal = -1;

                if(a.authority.indexOf("admin.png") == -1 && b.authority.indexOf("admin.png") != -1) retVal = 1;
                if(a.authority.indexOf("creator.png") == -1 && b.authority.indexOf("creator.png") != -1) retVal = 1;
                if(a.authority.indexOf("mod.png") == -1 && b.authority.indexOf("mod.png") != -1) retVal = 1;
            }
            
            return retVal;
        });
        
        var sidebarHtml = '<div class="btn-group" id="sidebar-buttons"><label id="sidebar-move" type="button" class="btn btn-default" onclick="moveNameList()">'+(isOnRight ? "&lt;" : "&gt;")+'</label><label id="sidebar-x" type="button" class="btn btn-default" onclick="removeNameList()">X</label></div><div class="dropdown" id="sidebar-sort-btn"><label id="sidebar-sort" type="button" class="btn btn-default" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Sorting <span class="caret"></span></label><ul class="dropdown-menu" style="padding: 5px;" role="menu aria-labelledby="sidebar-sort"><li class="dd-option" onclick="sortNameList(\'default\');">Join Order</li><li class="dd-option" onclick="sortNameList(\'alpha\');">Alphabetical</li><li><hr></li><li class="dd-option" onclick="sortNameList(\'adminmodsfirst\');">'+(adminModsFirst ? "&#9745" : "&#9744")+' Admin/Mods First</li></ul></div><br/><br/><h3 style="margin-top: 10px;">Users: '+users.length+'</h3><ul id="names">';
        for (var i = 0; i < users.length; i++)
        {
            sidebarHtml += "<li>"+"<span class='authority-tag'>"+users[i].authority+"</span><span class='gender-role-tags'>"+users[i].gender+users[i].role+"</span>"+users[i].nick+"</li>";
        }
        sidebarHtml += "</ul>";

        nameList.html(sidebarHtml);
    }
}

function sortNameList(type)
{
    if (type == "adminmodsfirst")
    {
        adminModsFirst = !adminModsFirst;
        setCookie("sortadminmodsfirst", adminModsFirst.toString());
    }
    else
    {
        setCookie("sorting", type);
        sorting = type;
    }
    socket.emit('reqnewroster');
}

function loadGif(id, url)
{
    document.getElementById("hiddenInd" + id.toString()).setAttribute("src", "/images/ldg.png");
    document.getElementById("hiddenInd" + id.toString()).setAttribute("onclick", "");
    document.getElementById("hiddenImg" + id.toString()).setAttribute("src", url);
    document.getElementById("hiddenLnk" + id.toString()).setAttribute("href", url);
}

function onGifLoaded(id) {
    document.getElementById("hiddenInd" + id.toString()).style.display = "none";
    document.getElementById("hiddenLnk" + id.toString()).style.display = "";
}

function toggleDayNight ()
{
    var stylesheet1 = $('#stylesheet1');
    var stylesheet2 = $('#stylesheet2');
    var stylesheet3 = $('#stylesheet3');
    var dayNightToggle = document.getElementById('daynbutton');
    var dayNightImage = document.getElementById('daynimage');
    //Text box
    var mainTextBox = document.getElementById('m');
    
    if (isDay)
    {
        stylesheet1.after("<link rel='stylesheet' type='text/css' href='/stylesheets/night/bootstrap.min.css' id='stylesheet4' />");
        stylesheet2.after("<link rel='stylesheet' type='text/css' href='/stylesheets/night/bootstrap-theme.min.css' id='stylesheet5' />");
        stylesheet3.after("<link rel='stylesheet' type='text/css' href='/stylesheets/night/style.css' id='stylesheet6' />");
    }
    else
    {
        $('#stylesheet4').remove();
        $('#stylesheet5').remove();
        $('#stylesheet6').remove();
        
    };
    dayNightImage.setAttribute('src', '/images/'+(isDay ? "day" : "night")+'.png');
    mainTextBox.style.backgroundColor = (isDay ? "#222222" : "#ffffff");
    mainTextBox.style.color = (isDay ? "#ffffff" : "#000000");
    isDay = !isDay;
}

// -----------
// Tooltips!!!
// -----------

function setupTooltip(icon)
{
    $("#"+icon).tooltip();
}

// ----------
// Cookies!!!
// ----------

function setUpSound () {
    
    soundMesg = getCookie("soundMesg", "false") == "true";
    soundMent = getCookie("soundMent", "true") == "true";
    soundJnLv = getCookie("soundJnLv", "false") == "true";
    soundSite = getCookie("soundSite", "true") == "true";
    $('#mesg-alerts').prop('checked', soundMesg);
    $('#ment-alerts').prop('checked', soundMent);
    $('#jnlv-alerts').prop('checked', soundJnLv);
    $('#site-alerts').prop('checked', soundSite);
}

// --------------
// For Straw Poll
// --------------
function modalPoll(pollId) {
    
    $('#iframe-modal-body').html("<iframe src='http://strawpoll.me/embed_1/"+pollId+"/r' style='width: 800px; height: 496px; border: 0; display: block; margin: auto;'>Loading poll...</iframe>");
    $('#iframe-modal-title').text("Straw Poll - Vote Now!");
    
    $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
}

// -----------
// For YouTube
// -----------
function modalYouTube(videoId, playlistId) {
    
    $('#iframe-modal-body').html("<iframe width='800' height='450' style='display: block; margin: auto;' src='http://www.youtube.com/embed/"+videoId+(playlistId != "" ? ("?list="+playlistId) : "")+"' frameborder='0' allowfullscreen></iframe>");
    $('#iframe-modal-title').text("YouTube");
    
    $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
}

function requestYouTubeEmbed (videoId) {
    
    if (isYapiLoaded)
    {
        gapi.client.youtube.videos.list({ part: "snippet,contentDetails,status,player,statistics", id: videoId}).then(youtubeRequestSucceeded, youtubeRequestFailed);
    }
    else
    {
        console.log("ERROR: Request attempted, but YouTube's API isn't loaded!")
    }
}

function youtubeApiLoad() {
    
    isGapiLoaded = true;
    if (apiKey != "NOKEY" && apiKey != "NOTLOADED")
    {
        gapi.client.setApiKey(apiKey);
        gapi.client.load('youtube', 'v3', function() {
            isYapiLoaded = true;
            console.log('YouTube API v3 Loaded.');
        });
    }
    else if (apiKey == "NOTLOADED")
    {
        console.log('Warning: YT API Key Not Yet Received. Will reattempt after connection to server.');
    }
    else
    {
        console.log('ERROR: YT API Key Invalid.');
    }
    
    apiKey = "";
}

function youtubeRequestSucceeded (resp) {
    
    console.log(resp.result);
    
    var resultingVideo = resp.result.items[0];
    var loadingContainers = document.getElementsByClassName('yt-loader-container');
    var correctContainer = null;
    
    for (var i = 0; i < loadingContainers.length; i++)
    {
        if (loadingContainers[i].getAttribute('videoid') == resultingVideo.id)
        {
            correctContainer = loadingContainers[i];
            break;
        }
    }
    
    if (correctContainer == null)
    {
        console.log('ERROR: Loading container not found for id: ' + resultingVideo.id);
    }
    
    if (/*resultingVideo.processingDetails.processingStatus == "succeeded"*/true) // Need to find out which requests only require the API key and not OAuth.
    {
        correctContainer.className = "";
        correctContainer.style.verticalAlign = "middle";
        correctContainer.style.display = "inline-block";
        
        var id = resultingVideo.id;
        var title = resultingVideo.snippet.title;
        var playlist = correctContainer.getAttribute('playlistid');
        var channel = resultingVideo.snippet.channelTitle;
        var channelLink = "http://www.youtube.com/channel/"+resultingVideo.snippet.channelId;
        
        var description = resultingVideo.snippet.description;
        var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/\,]*(\.[\w\-_()\:]+)?(?:[\-\+=&;%@\.\w?#\/\:\,]*))/gi;
        description = description.replace(link, "<a tabindex='-1' target='_blank' href='http://$1'>$1</a>");
        description = description.replace("\n", "<br />");
        
        var views = resultingVideo.statistics.viewCount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        
        var length = resultingVideo.contentDetails.duration;
        var durationRegex = /PT(?:([0-9]{1,2})H)?(?:([0-9]{1,2})M)?(?:([0-9]{1,2})S)?/g;
        var hours = length.replace(durationRegex, "$1");
        var minutes = length.replace(durationRegex, "$2");
        var seconds = length.replace(durationRegex, "$3");
        
        if (length == "P1D")
        {
            length = "1 Day (Why?)";
        }
        else
        {
            length = (hours != "" ? hours+":" : "");
            length += (hours != "" ? (minutes != "" ? (minutes.length < 2 ? "0"+minutes : minutes) : "00") : (minutes != "" ? minutes : "0"))+":";
            length += (seconds.length < 2 ? (seconds.length < 1 ? "00" : "0"+seconds) : seconds);
        }
        
        var displayString = "<div class='yt-video-container'>\n<div class='yt-thumbnail'>\n<a target='_blank' class='yt-thumbnail-imglink' href='http://www.youtube.com/watch?v="+id+"'>\n<span class='yt-thumbnail-imgspan'>\n<img class='yt-thumbnail-img' src='http://i.ytimg.com/vi/"+id+"/mqdefault.jpg' />\n</span>\n<span class='yt-thumbnail-time'>"+length+"</span>\n</a>\n</div>\n<div class='yt-details'>\n<h3 class='yt-details-title'><a target='_blank' href='http://www.youtube.com/watch?v="+id+"'>"+title+"</a></h3>\n<div style='display: block; margin: 5px 0 0;'>\n<ul class='yt-details-meta'>\n<li style='padding: 0px;'>by <a target='_blank' href='"+channelLink+"'>"+channel+"</a></li>\n<li style='padding: 0px;'>"+views+" views</li>\n</ul>\n</div>\n<div class='yt-details-desc'>"+description+"</div>\n</div>\n</div>";
        var embedString = resultingVideo.status.embeddable ? "\n<div class='yt-video-container' style='width: 112px;' videoid='"+id+" playlistid='"+playlist+"'>\n<img src='/images/yt-play-embedded.png' style='cursor: pointer;' onclick='modalYouTube(\""+id+"\", \""+playlist+"\")' />\n</div>" : "\n<div class='yt-video-container' style='width: 112px;' videoid='"+id+" playlistid='"+playlist+"'>\n<img src='/images/yt-cant-embed.png' />\n</div>";
        
        correctContainer.innerHTML = displayString+embedString;
    }
    else
    {
        correctContainer.innerHTML = "<span style='vertical-align: middle; text-align: center;'>Video Not Processed.</span>";
    }
}

function youtubeRequestFailed (reason) {
    
    isYapiLoaded = false;
    console.log("Error: " + reason.result.message);
    var loadingContainers = document.getElementsByClassName('yt-loader-container');
    
    for (var i = 0; i < loadingContainers.length; i++)
    {
        loadingContainers[i].innerHTML = "YouTube API Not Loaded =/"
    }
}
// -----------
// Regex Stuff
// -----------
function link_replacer(match, p1, p2, offset, string)
{
    return "<a tabindex='-1' target='_blank' href='http://"+p1+"'>"+p1+"</a>";
}

window.onbeforeunload = confirmExit;
function confirmExit()
{
    if (chatting || bigchat)
        return "Wait, you're still in a chat session!";
}

function changeTitle()
{
    document.title = isOldTitle ? oldTitle : newTitle;
    isOldTitle = !isOldTitle;
}
