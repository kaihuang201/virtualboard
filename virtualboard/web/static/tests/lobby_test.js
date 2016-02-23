// this file has tests of lobbyList.js

var expect = chai.expect;

describe("lobbyList.js", function() {
	it("init", function() {
		expect(function(){
			lobbyList.init();
		}).to.not.throw(Error);
	});

	it("openModalOnClick", function() {
		expect(function(){
			lobbyList.openModalOnClick();
		}).to.not.throw(Error);
	});

	it("submitForm", function() {
		expect(function(){
			lobbyList.submitForm();
		}).to.not.throw(Error);
	});

	it("displayErrors", function([1,2]) {
		expect(function(){
			lobbyList.displayErrors();
		}).to.not.throw(Error);
		
	});

	it("clearErrorActions", function() {
		expect(function(){
			lobbyList.clearErrorActions();
		}).to.not.throw(Error);
	});

	it("getCookie", function() {
		expect(function(){
			lobbyList.getCookie('abc');
		}).to.not.throw(Error);
	});
});