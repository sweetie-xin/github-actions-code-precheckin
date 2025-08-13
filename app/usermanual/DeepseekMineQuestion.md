**问题1：DeepseekMine软件下载方式？**

公众号郭震AI 后台回复：知识库 即可获得下载地址

现在链接是一个百度网盘链接，V0.6版本是最新版本的

**下载地址在这个红色的小框中。**

![download](/usermanual_pic/download.jpg)

**问题2：如何获取邀请码？**

（1）登录https://zglg.work/  

（2）点击免费获邀请码 

![invite](/usermanual_pic/invite.jpg)

**问题3：内网电脑无法联接外网，如何绑定邀请码？**

用外网的电脑（或手机）先去获取验证码，之后记录下来。我们的邀请码是一次申请绑定可以永久使用哈，无需重复申请哈。

**问题4：本地没有大模型，如deepseek-r1，怎么办？**

（1）下载ollama：郭震AI公众号 后台回复：ollama

（2）运行命令：ollama pull deepseek-r1:1.5b

（3）命令行验证一下：运行ollama run deepseek-r1:1.5b，出现下面的界面说明安装成功。

![ollama](/usermanual_pic/ollama.jpg)

**问题5：很多朋友遇到了，安装后打开软件没有反映的现象，大家可以试试如下的几个方法看是否能解决问题哈**

1、关闭软件，重新打开

2、检查软件，要将deepseekmine安装在没有中文的文件夹。

3、要将deepseekmine安装在没有空格的文件夹。注意：Program Files就是常用的默认文件夹，不要安装在这个。

4、如果安装后，无法打开可以试试卸载，再安装到其他的盘符。

打开deepseekmine的属性，点击安全，一定要保证当前用户有权限才可以。

![anzhuang](/usermanual_pic/anzhuang-1.jpg)
​
如下的情况会导致无法运行

![anzhuang](/usermanual_pic/anzhuang-2.jpg)​    

6、安装时遇到如下错误

![anzhuang](/usermanual_pic/anzhuang-3.jpg)​    

按照下面图的方式

![anzhuang](/usermanual_pic/anzhuang-4.jpg)​    

**问题7：聊天框问题**

1、如果大家发现AI聊天框能输出内容，但是聊天框中回复的内容是报错的信息。这种情况的是由于模型错误导致的。可能是本地模型连接上，或者远程模型url和APIKEY不是一套的。

2、没有正确pull本地大模型，或者没有正确启动ollama

​![chat](/usermanual_pic/chat-1.jpg)​    

**问题8：上传失败问题**

1、上传文件的时候，大家不要一次上传的太多，5-8个左右为一个批次上传，如果上传太多可能会上传失败哈。

2、目前版本的deepseekmine暂不支持图片pdf和加密的pdf。