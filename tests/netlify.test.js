const {test}=require('node:test');
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/api');

test('Netlify Express adapter preserves /api routes and returns validation errors',async()=>{
    const response=await handler({httpMethod:'GET',path:'/api/search',headers:{},queryStringParameters:{q:''},body:null},{},()=>{});
    assert.equal(response.statusCode,400);
    assert.match(response.headers['content-type'],/application\/json/);
    assert.match(response.body,/search query is required/);
});
