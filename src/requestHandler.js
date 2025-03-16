window.onload = () => {
    const baseCurrency = document.getElementById('base-currency');  
    Object.entries(currencies).forEach(([code, name]) => {  
        // Create options for the 'from' currency select menu
        const option1 = document.createElement('option');
        option1.value = name;
        option1.textContent = `${name} (${code})`;
        baseCurrency.appendChild(option1);
        if(name[0]==='USD')
            option1.selected = true; 
    });
     
};

async function loadRates(){
    const erates = await getRates();
    console.log({d: erates, len:erates.length})
    const ratesBody = document.getElementById('rates-content');
    ratesBody.innerHTML = ""; 
    for(let code in erates)
    {
        //populate the table body
        const rowElement = document.createElement('tr');
        rowElement.classList.add("hover:bg-gray-100");
        const nameElement =  document.createElement('td');
        nameElement.classList.add("p-3", "border-b");
        const currentElement =  document.createElement('td');
        currentElement.classList.add("p-3", "border-b", "font-semibold");
        const rateElement =  document.createElement('td');
        rateElement.classList.add("p-3", "border-b", "text-green-600");

        nameElement.textContent = currencies[code];
        currentElement.textContent = code;
        rateElement.textContent = erates[code].toFixed(5);
        
        rowElement.append(nameElement, currentElement, rateElement); //append the 3 elements at once
        ratesBody.appendChild(rowElement);
    }

}

async function getRates() {
    try {
        const baseCurrency = document.getElementById('base-currency').value; // Get the value

        const response = await fetch('http://localhost:3000/api/rates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ baseCurrency: baseCurrency })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log({ s: true, d: data });
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error; // Rethrow the error to allow calling code to handle it.
    }
}
