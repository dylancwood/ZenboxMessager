ZenboxMessager
==============

JS Utilities to pre-populate custom fields in Zendesk Feedback Tab popup and Tickets

**Background**
Zendesk provides an awesome service and interface. Among its features is a feedback tab that that can sit on every page of your site. When a user clicks on the tab, a modal popup magically appears that allows the user to submit a ticket or seach your knowledge base (more info on the feedback tab here: https://support.zendesk.com/entries/20990726-Setting-up-your-Feedback-Tab-channel)

It is possible to dynamically pass a *customer name* and *email address* to the Zendesk popup (called the Zenbox) using the native Zendesk tools, however, any custom fields cannot dynamically populated using the Zendesk API. Based on some hints on the Zendesk forums, I wrote this little utility that should allow others to easily populate the custom fields of the Zendesk Feedback Channel. 

**Basic concept**
The utility uses the native Javascript postMessage() API to send messages across windows from different domains without violating the same origin policy. In order for this to work, you must serve the ZenboxMessager.js script from your domain, and paste the ZenboxListener code inside the CSS of your Zendesk Feedback tab. *Note: This is technically Javascript injection, and it is usually frowned upon. Zendesk may decide to strip script tags from the custom CSS at some point, and this will no longer work... Hopefully they provide warning to us, and a reasonable workaround (like a custom JS field, or native support for custom fields in their API!)*

**Use**
1. Inlcude the ZenboxMessager.js script in the head or body of each page that uses the Zendesk Feedback Tab: 
'''html
<script type="text/javascript" src="js/ZenboxMessager/ZenboxMessager.js"></script>
'''
2. Copy the entire text from ZenboxListener.txt into the custom CSS field of your Feedback Tab (it can go before or after your custom CSS).
3. Immediately after you call Zenbox.init, initialize the ZenboxMessager as well (you can place the ZenboxMessager init call inside the same script tag that is provided by Zendesk):
```html
<script type="text/javascript">
if (window.ZenboxMessager !== undefined 
  && typeof(window.Zenbox) !== undefined
) {
  window.Zenbox.init({
    dropboxID: "123456789",
    url: "https://example.zendesk.com",
    tabTooltip: "Support",
    tabImageURL: "https://assets.zendesk.com/external/zenbox/images/tab_support_right.png",
    tabColor: "#6d8b9f",
    tabPosition: "Right",
    //requester_name: this.userLabel,
    //requester_email: this.userEmail
  });
                
  //the support tab element should now be in the DOM.
  //now instantiate the zenboxmessager
  if (zenboxTab =  document.getElementById('zenbox_tab')) {
    window.zendeskPrePopData = {
      'field_23843218': 'Customness 1',
      'field_23836017': 'Customness 2'
    };
    window.ZenboxMessager.init(
      "https://example.zendesk.com",
      window.zendeskPrePopData
    );
    //now tell the messager to send the custom data to zenbox
    //when the tab is clicked. the same technique can be used
    //for custom links that bring up the zendesk popup.
    window.ZenboxMessager.addMessageEvent(zenboxTab, 'click');
  }
}  
</script>
```

**Data for pre-populating fields with**
When you initialize the ZenboxMessager, you will need to pass in two arguments: the first is the full url of your Zendesk site (e.g. https://example.zendesk.com). The second is an object of the following form: 
```json
{
  "field_key1":"value1",
  ...,
  "field_keyn":"valuen"
}
```
Where the field keys are the ids of the elements to be prepopulated (use browser developer tools to inspect each element and get the IDs), and the values are the values to populate each field key with.

If you reference this object from your global scope, or somewhere else permanent, then you can mutate it as the user ineracts with your application, and the most up-to-date data will be pre-populated when they finally click the feedback tab. For example:
```js
window.zendeskPrePopData = {"field_123456":"loading"};
...
window.ZendeskMessager.init("https://example.zendesk.com", window.zendeskPrePopData);
...
...
//when app is done loading, update the field accordingly
window.zendeskPrePoData.field_123456 = "ready@" + (new Date()).getTime();
```

**Notes**
1. After the user clicks on the Feedback Tab, it takes a little while for Zendesk's javascript to load the modal popup. While that is happening, the origin of the Zendesk iframe is not the same as your Zendesk URL. as a result, you will see a few javascript errors in your console that look like this:
```
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://coins.zendesk.com') does not match the recipient window's origin ('https://assets.zendesk.com'). 
```
Once the popup is initialized, the Zendesk iframe will have an origin that matches your Zendesk URL, and the messages from the ZendeskMessager will go through without error. I don't **think** that this is a major problem. Unfortunately, I know of no way to programmatically determine the origin of a window before attempting to send a message to it. These errors are harmless, and shouldn't be cause for concern.

**TODO** The only way that I can think of to fix this would be to have the Zendesk Window message the main window when it is ready. Then, the main window would send the Zendesk window the custom data. This would be a cleaner way to do it overall, as it would avoid the issue of having to assign event handlers to each element that opens the feedback popup. 

2. The Javascript presented here should be functional as is, but I have simplified it to illustrate the key concepts of ZenboxMessager. In a production environment, I suggest using function closures, and avoiding assigning vars as window properties where possible.  
