// src/PrepareDataBasedOnURL.js
import React, { useState, useEffect } from 'react';
import callAPI from './callAPI';


function GetData() {

    const [data, setData] = useState('');
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const response = await callAPI(`/api/get_data`);
                setData(JSON.stringify(response));
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }

        };

        fetchInitialData();
    }, []);




    return (
        <div>
            <h2>Get Data</h2>
            <p>Display some data.</p>

            <div>
                <textarea
                    value={data}
                    rows="5"
                    style={{ width: '100%' }}
                />
                <br />

            </div>


            {loading && <p>Loading...</p>}


        </div>
    );
}

export default GetData;