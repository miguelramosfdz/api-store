# Get the list of people interested in a LinkedIn Learning Course

LinkedIn recently rolled out its Learning Center. Dedicated to professionals wishing to stay ahead in their careers, it offers a variety of highly specialized courses. 

Thanks to our tool, you will be able to extract a list of people interested (ie. having *Liked*) each course. Very useful for hiring new talents or proposing similar courses. 

Make a list of every course you're interested in and we'll come back to you with:
1. LinkedIn profile links. <i>(can be used with our other API: <a href="https://phantombuster.com/api-store/2818/linkedin-network-booster" target="_blank">LinkedIn Network Booster</a>)</i>
2. Current job/position of every liker.
3. Names of who liked.

# What will you need to get those Learners? ⚙️ 

- **Session cookie**: Your session cookie from LinkedIn.
- **Post URL**: The direct link of a LinkedIn post.
- **CSV name**: The name of the CSV file you'll be creating.

# How long does that take to set up this tool?
You'll be set in less than **2minutes**. 🕒

# What do you need to do?

## 1. Use this API on your account.👌
_(If you don't have an account yet, follow [me](https://phantombuster.com/register))_ 

<center><button type="button" class="btn btn-warning callToAction" onclick="useThisApi()">USE THIS API!</button></center>


## 2. Click on Configure me!
You'll now see the 3 configuration dots blinking. Click on them.

<center>![](https://phantombuster.imgix.net/api-store/Linkedin_Post_commenters/configure_me.JPG)</center>


## 3. Linkedin authentication 🔑 { argument }
_(You already know how to get your sessionCookie? <a href="#section_posturl">skip this part</a>)_
Because the script will manipulate LinkedIn for you, it needs to be logged in to your LinkedIn account. For that you just need to copy paste your session cookie in the script argument:
* Using Chrome, go to your LinkedIn homepage and open the inspector  
→ Right click anywhere on the page and select “Inspect” ![](https://phantombuster.imgix.net/api-store/Inspect+browser.png)  
→ <kbd>CMD</kbd>+<kbd>OPT</kbd>+<kbd>i</kbd> on macOS  
or  
→ <kbd>F12</kbd> or <kbd>CTRL</kbd>+<kbd>MAJ</kbd>+<kbd>i</kbd> on Windows

* Locate the “Application” tab

<center>![](https://phantombuster.imgix.net/api-store/li_at+1.png)</center>

* Select “Cookies” > “http://www.linkedin.com” on the left menu.

<center>![](https://phantombuster.imgix.net/api-store/li_at+2.png)</center>

* Locate the “li_at” cookie.

<center>![](https://phantombuster.imgix.net/api-store/li_at+3.png)</center/>

* Copy what’s under “Value” (**Double click** on it then <kbd>Ctrl</kbd>+<kbd>C</kbd>) and paste it into your script _Argument_)

_// How to access your cookies with <a href="https://developer.mozilla.org/en-US/docs/Tools/Storage_Inspector" target="_blank">Firefox</a> and <a href="https://www.macobserver.com/tmo/article/see_full_cookie_details_in_safari_5.1" target="_blank">Safari</a>//_


## 4. Add a LinkedIn course URL 📑 {posturl}
Below your session cookie you’ll find **Course URL**

Add in the text field the link of the course you want to scrape or the Public URL of a Google Spreadsheet with multiple courses:
<center>![](https://phantombuster.imgix.net/api-store/Linkedin_Post_commenters/Copy_link.JPG)</center>

## 5. Name your future CSV
Just add in the textbox the name you want to give your CSV.

Click on 💾 <span style="color:blue">Save</span>

# Click on Launch & Enjoy!
It’s done! All that is left to do is to click on "launch" to try your script!

<center>![](https://phantombuster.imgix.net/api-store/launch.JPG)</center>

Once the script has finished his work, download the CSV by clicking on "**Link (download/share)**"

<center>![](https://phantombuster.imgix.net/api-store/Linkedin_Post_commenters/download.png)</center>


<center>---</center>


Now that you have your CSV, you can import it into a new Google Spreadsheet and use our script <a href="https://phantombuster.com/api-store/2818/linkedin-network-booster" target="_blank">LinkedIn Network Booster</a> to add every liker with a personnalized message.