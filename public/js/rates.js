window.onload = () => {
    const baseCurrency = document.getElementById('base-currency'); 
    console.log({cur:currencies})
    Object.entries(currencies).forEach(([code, name]) => { 
        console.log({code,name})
        // Create options for the 'from' currency select menu
        const option1 = document.createElement('option');
        option1.value = name;
        option1.textContent = `${name} (${code})`;
        baseCurrency.appendChild(option1);
        if(name[0]==='USD')
            option1.selected = true; 
    });
};