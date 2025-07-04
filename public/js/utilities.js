function asyncGet(url, param){
return $.ajax({
type: "GET",
url: url + param
});
};

function asyncPost(url, param, data){

return new Promise((res, rej) => {
$.ajax({
type: "POST",
url: url + param,
data: data,
async: true,
processData: false,
contentType: false,
success: function(data, status, xhr) {
res(data);
},
error: function(jqXhr, textStatus, errorMessage) {
console.log(jqXhr);
res({
success: false,
message: jqXhr.responseJSON.error
});
}
});
});
};

function asyncDelete(url, param){

return new Promise((res, rej) => {
$.ajax({
type: "DELETE",
url: url + param,
async: true,
success: function(data, status, xhr) {
res(data);
},
error: function(jqXhr, textStatus, errorMessage) {
console.log(jqXhr);
res({
success: false,
message: jqXhr.responseJSON.error
});
}
});
});
};

$('form').on("change", ".custom-file-input", function(){
$(this).next('.custom-file-label').html($(this).val().replace(/.*(\/|\\)/, ''));
});
