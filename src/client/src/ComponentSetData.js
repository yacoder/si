// src/PrepareDataBasedOnURL.js
import React, { useState, useEffect } from 'react';
import callAPI from './callAPI';


function SetData() {

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

    const handleUseData = async () => {
        try {
            await callAPI(`/api/set_data`, 'POST', { data: JSON.parse(data) });
        } catch (error) {
            console.error('Error setting data:', error);
        }
    };



    return (
        <div>
            <h2>Save Data</h2>
            <p>Set some data.</p>

            <div>
                <textarea
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder="Enter your data here"
                    rows="5"
                    style={{ width: '100%' }}
                />
                <br />
                <button onClick={handleUseData}>Click here to change the data</button>
            </div>


            {loading && <p>Loading...</p>}


        </div>
    );
}

export default SetData;