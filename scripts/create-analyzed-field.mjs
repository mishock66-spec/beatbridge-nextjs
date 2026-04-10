import { config } from 'dotenv';
config({ path: '.env.local' });

const res = await fetch(
  'https://api.airtable.com/v0/meta/bases/appW42oNhB9Hl14bq/tables/tbl0nVXbK5BQnU5FM/fields',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'analyzed',
      type: 'checkbox',
      options: { icon: 'check', color: 'greenBright' }
    })
  }
);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
