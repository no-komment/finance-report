import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonth, addExpense, totals, mergeData, migrateData } from '../js/expenses.js';

function base(){return migrateData({version:1,settings:{currency:'RUB',locale:'ru-RU'},categories:['Еда'],types:['Личный','Семейный'],months:[]});}

test('CRUD helpers and totals',()=>{
  const data=base();
  const month=createMonth(data,{year:2026,month:8,income:1000});
  addExpense(data,month,{day:1,category:'Еда',description:'Дом',amount:250.5,type:'Семейный'});
  addExpense(data,month,{day:2,category:'Еда',description:'Кофе',amount:49.5,type:'Личный'});
  const t=totals(month);
  assert.equal(t.total,300);
  assert.equal(t.balance,700);
  assert.equal(t.byCategory[0].amount,300);
});

test('duplicate month rejected',()=>{
  const data=base(); createMonth(data,{year:2026,month:8});
  assert.throws(()=>createMonth(data,{year:2026,month:8}),/уже существует/);
});

test('merge does not duplicate exact expense',()=>{
  const a=base(); const m=createMonth(a,{year:2026,month:8,income:100}); addExpense(a,m,{day:1,category:'Еда',description:'Дом',amount:10,type:'Личный'});
  const b=structuredClone(a); b.months[0].expenses[0].id='different-id'; b.months[0].expenses.push({...b.months[0].expenses[0],id:'new-id',description:'Кофе'});
  const merged=mergeData(a,b);
  assert.equal(merged.months[0].expenses.length,2);
});

test('invalid day rejected',()=>{
  const data=base(); const m=createMonth(data,{year:2026,month:2});
  assert.throws(()=>addExpense(data,m,{day:30,category:'Еда',description:'x',amount:1,type:'Личный'}),/Некорректный день/);
});
