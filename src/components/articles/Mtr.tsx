import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import mtrLogo from '../../assets/mtr/mtr.svg';
import crossPlatform from '../../assets/mtr/article/crossplatform.webp';
import railProperty from '../../assets/mtr/article/railproperty.jpg';

import propertiesData from '../../assets/mtr/article/properties.json';

function Link({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a
            href={href}
            className="effect-underline text-blue-600"
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    );
}

export default function Mtr() {
    useEffect(() => {
        document.body.style.overflow = 'auto';
    }, []);

    return (
        <div className="max-w-dvw min-h-dvh flex flex-col">
            <header>
                <nav className="py-4 px-3" aria-label="Article navigation">
                    <RouterLink to="/mtr" className="nav-btn py-1.5!">
                        Return to Map
                    </RouterLink>
                </nav>
            </header>
            <main className="grow">
                <article className="grow flex flex-col gap-8 items-center justify-center px-10 sm:px-20 lg:px-30 xl:px-60 py-20">
                    <img src={mtrLogo} alt="MTR Corporation logo" className="h-50 w-auto" />
                    <div className="flex flex-col gap-3 items-center text-center">
                        <h1 className="text-5xl font-bold font-serif text-shadow-lg">
                            The MTR System of Hong Kong
                        </h1>
                        <p className="text-xl font-medium mb-8">By Tom the Bomb</p>
                    </div>
                    <div className="flex flex-col gap-7 text-base/7">
                        <section aria-label="Introduction">
                            <p>
                                In a world with ever-evolving transportation technology, metro
                                systems remain one of the most prevalent modes of transportation
                                globally. For various cities, a good metro system represents their
                                bloodline, providing the population with a more convenient,
                                affordable, and environmentally friendly alternative for their daily
                                commute. Yet, designing and constructing a successful, robust system
                                can be quite a daunting task, especially for developing nations.
                                Even today, we still observe a significant discrepancy in the
                                quality of systems across various cities worldwide, with some
                                systems being objectively inferior to others, even in comparably
                                sized cities. Among these many metropolises, Hong Kong stands out as
                                one that boasts one of the best transit networks in the world. With
                                a robust public transit system featuring 10 heavy rail lines with 98
                                stations, a 68-station light rail network, and a vast network of
                                buses and trams throughout the city. In 2024, there were around 12
                                million passenger journeys daily taken on public transit (6 million
                                on the{' '}
                                <Link href="https://wikipedia.org/wiki/Mass_Transit_Railway">
                                    Mass Transit Railway (MTR)
                                </Link>{' '}
                                alone), in a city of just over 7 million people.
                            </p>
                            <p className="mt-7">
                                For most cities, public transit is viewed as social welfare, and is
                                only used by the young and lower class. Driving remains the primary
                                method of transportation; therefore, transit fares are kept low as
                                an alternative for those who cannot afford to drive. As a result,
                                most systems operate at a deficit and require substantial government
                                subsidies. Thus, many systems' infrastructure is built and
                                maintained at a bare minimum, resulting in low frequencies, poor
                                on-time rates, and minimal coverage. The MTR operates under a unique
                                business model, placing it as one of the only metro systems in the
                                world that operate at a profit. By involving itself in the real
                                estate sector, the MTR's Rail + Property model allows it to profit
                                from the increase in land value following transit development. As a
                                result, numerous properties in Hong Kong are built and owned by the
                                MTR, including several shopping malls, office buildings, and entire
                                new towns. By being self-sustaining and not reliant on government
                                subsidies, the MTR can operate a highly efficient, modern metro
                                system (with a 99.9% on-time rate) that is preferred by residents
                                over any other mode of transportation.
                            </p>
                        </section>
                        <section
                            className="flex flex-col gap-4"
                            aria-labelledby="rail-property-heading"
                        >
                            <h2 className="text-2xl font-bold" id="rail-property-heading">
                                Rail + Property Model
                            </h2>
                            <p>
                                When the MTR wants to build a new line, the government first
                                provides it with land development rights at stations or depots along
                                the route. The MTR pays the government the land's market value
                                (pre-railway construction) and then constructs the railway line. The
                                MTR then partners with private developers to build properties on the
                                land it has acquired, and they end up receiving a share of the
                                profits that the developers make from these properties. Through
                                this, the MTR generates funds for future railway projects and
                                regular maintenance of the existing network. As an example, the MTR
                                made a profit of $16bn HKD in 2014, despite their fares still being
                                maintained at a low average of ~$7 HKD per trip, as nearly half of
                                it came from its properties.
                            </p>
                            <div>
                                <h3 className="text-xl font-bold">History</h3>
                                <p>
                                    In the 1960s, Hong Kong was a British colony experiencing rapid
                                    population growth and urbanization. The colonial government
                                    recognized the need for an underground transportation system to
                                    alleviate traffic congestion and support economic development.
                                    In 1975, the MTR Corporation was established as a
                                    government-owned entity to oversee the construction and
                                    operation of the metro system. During its establishment, the
                                    government required that the MTR adhere to "prudent commercial
                                    principles", the main reason behind the system's success today.
                                    These principles required the MTR to secure a satisfactory rate
                                    of return on its projects, and its day-to-day operating costs
                                    must be fully covered by revenues. The motive behind this was to
                                    ensure the MTR would be self-sustaining and not reliant on
                                    government subsidies, which the government at the time believed
                                    to be important to avoid dealing with the volatility of
                                    politics, something they had experience with back in the UK with
                                    the London Underground. These policies forced the MTR to involve
                                    itself in other business activities, and hence the Rail +
                                    Property model was born.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Examples</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    <div className="flex flex-col gap-2">
                                        <p>
                                            Some of the most notable examples of properties
                                            developed by the MTR include:
                                        </p>
                                        <ul className="list-disc list-inside">
                                            {propertiesData.stations.map(station => (
                                                <li key={station.name}>
                                                    <a
                                                        href={station.href}
                                                        className="font-bold effect-underline text-blue-600"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {station.name}
                                                    </a>
                                                    <ul className="list-disc list-inside ml-5">
                                                        {station.properties.map((name, index) => (
                                                            <li key={index}>{name}</li>
                                                        ))}
                                                    </ul>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <img
                                        src={railProperty}
                                        alt="Aerial view of MTR rail property development showing residential and commercial buildings integrated with railway stations"
                                        loading="lazy"
                                        className="rounded-md drop-shadow-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">The Uniqueness of Hong Kong</h3>
                                <p>
                                    We can see that, unlike most metro systems, which come after the
                                    development of a city, the MTR was built alongside the
                                    development of Hong Kong, with numerous properties and towns
                                    having been constructed solely due to the MTR. Hong Kong is a
                                    small city with a high population density, making land and new
                                    properties extremely in demand. Currently, only 25% of Hong
                                    Kong's land area is developed, with the rest remaining as
                                    country parks and natural reserves. This scarcity has made the
                                    MTR's development of satellite towns such as &nbsp;
                                    <Link href="https://en.wikipedia.org/wiki/LOHAS_Park">
                                        LOHAS Park
                                    </Link>{' '}
                                    and &nbsp;
                                    <Link href="https://en.wikipedia.org/wiki/Tung_Chung">
                                        Tung Chung
                                    </Link>{' '}
                                    even more critical to Hong Kong's growth. The lands these towns
                                    are built on were previously empty inacessible, giving the MTR a
                                    perfect opportunity to connect it via rail, driving up land
                                    value, and building properties to accommodate the growing
                                    population, and of course, turn a profit for the corporation.
                                </p>
                                <p className="mt-4">
                                    The MTR is the past, present, and future of Hong Kong, having
                                    followed the development of the city from its early days, back
                                    when it was not an economic powerhouse like it is today. Most of
                                    the population is reliant on public transit more than anything
                                    else to get around the city. In fact, over 90% of daily journeys
                                    in Hong Kong are made using public transport, one of the highest
                                    rates in the world. While the US has 800 cars for every 1000
                                    people, Hong Kong only has 92. Car ownership in Hong Kong is
                                    very expensive, and after factoring in parking and congestion,
                                    it is simply not worth it for the majority of the population.
                                    With such a high reliance on public transit, the MTR has the
                                    ability to influence where these 90% of people go everyday, and
                                    thus, making property around stations extremely valuable to
                                    businesses and developers.
                                </p>
                            </div>
                        </section>
                        <section
                            className="flex flex-col gap-4"
                            aria-labelledby="spotlight-heading"
                        >
                            <h2 className="text-2xl font-bold" id="spotlight-heading">
                                MTR Spotlight
                            </h2>
                            <p>
                                Aside from being a well-maintained, efficient, and modern metro
                                system, the MTR also has various other unique features that make it
                                one of a kind, securing its spot as one of the best metro systems in
                                the world.
                            </p>
                            <div>
                                <h3 className="text-xl font-bold">Cross-Platform Interchanges</h3>
                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <p>
                                            Cross-platform interchanges are a feature that allows
                                            passengers to transfer between two lines by simply
                                            walking across the platform, without needing to go up or
                                            down stairs. This feature is extremely convenient, as it
                                            reduces transfer times and congestion in the station,
                                            especially during peak hours. Not only does the MTR have
                                            the highest number of cross-platform interchanges of any
                                            system in the world, but it has taken it a step further
                                            by implementing bi-directional cross-platform
                                            interchanges at 2 consecutive stations. What this means
                                            is that when interchanging between 2 lines, instead of
                                            only being able to interchange at only 1 station,
                                            passengers can interchange at either of 2 consecutive
                                            stations, depending on which direction they wish to go.
                                        </p>
                                        <img
                                            src={crossPlatform}
                                            alt="Diagram illustrating MTR cross-platform interchange design allowing passengers to transfer between lines by walking across the platform"
                                            loading="lazy"
                                            className="rounded-md p-2 shadow-lg"
                                        />
                                    </div>
                                    <p>
                                        An example of this is the interchange between the &nbsp;
                                        <Link href="https://en.wikipedia.org/wiki/Tseung_Kwan_O_Line">
                                            Tseung Kwan O Line
                                        </Link>{' '}
                                        and the &nbsp;
                                        <Link href="https://en.wikipedia.org/wiki/Kwun_Tong_Line">
                                            Kwun Tong Line
                                        </Link>{' '}
                                        at &nbsp;
                                        <Link href="https://en.wikipedia.org/wiki/Yau_Tong_station">
                                            Yau Tong
                                        </Link>{' '}
                                        and &nbsp;
                                        <Link href="https://en.wikipedia.org/wiki/Tiu_Keng_Leng_station">
                                            Tiu Keng Leng
                                        </Link>{' '}
                                        stations. At Yau Tong station, passengers traveling towards{' '}
                                        <Link href="https://en.wikipedia.org/wiki/Whampoa_station">
                                            Whampoa
                                        </Link>{' '}
                                        on the Kwun Tong Line can simply cross the platform to board
                                        the Tseung Kwan O Line train heading towards{' '}
                                        <Link href="https://en.wikipedia.org/wiki/Po_Lam_station">
                                            Po Lam
                                        </Link>
                                        . This allows for an cross-platform interchange between
                                        trains going the <b>opposite</b> directions. Conversely, at
                                        Tiu Keng Leng station, passengers traveling towards &nbsp;
                                        <Link href="https://en.wikipedia.org/wiki/North_Point_station">
                                            North Point
                                        </Link>{' '}
                                        on the Kwun Tong Line can cross the platform to board the
                                        Tseung Kwan O Line train heading towards &nbsp;
                                        <Link href="https://en.wikipedia.org/wiki/LOHAS_Park_station">
                                            LOHAS Park
                                        </Link>
                                        , enabling &nbsp;<b>same-direction</b> cross-platform
                                        interchanges. This 2 station interchange system allows for
                                        both same-direction and opposite-direction cross-platform
                                        interchanges, such that passengers are able take advantage
                                        of cross-platform interchanges regardless of their
                                        direction/route. Combined with the high frequency of trains
                                        on both lines, this seamless setup makes it feel like the
                                        two lines are effectively one. Although this may seem
                                        simple, it actually requires meticulous planning and
                                        engineering, as somewhere between the 2 stations, the tracks
                                        of at least 1 line must swap in order to achieve this
                                        effect.
                                    </p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Octopus Card</h3>
                                <p>
                                    Introduced in 1997 by the MTR, the &nbsp;
                                    <Link href="https://www.octopus.com.hk/en/consumer/octopus-cards/about/index.html">
                                        Octopus Card (八達通)
                                    </Link>{' '}
                                    was one of the world's first contactless smart card systems for
                                    public transportation. The card can be used to pay for fares on
                                    the MTR, buses, trams, ferries, and much more. Unlike other
                                    transit cards, which are only used for transportation, the
                                    Octopus Card has become one of the most popular payment methods
                                    in Hong Kong in general, from food to shopping, to even taking
                                    attendance at schools. It is so popular that recently, stores in
                                    Japan have begun accepting Octopus Cards as a payment method due
                                    to the large number of Hong Kong tourists.
                                </p>
                            </div>
                        </section>
                        <section aria-labelledby="overseas-heading">
                            <h2 className="text-2xl font-bold" id="overseas-heading">
                                Overseas Projects
                            </h2>
                            <p className="mt-4">
                                The MTR's projects are not limited to Hong Kong. Due to its success,
                                the MTR has been commissioned to work on and operate several metro
                                systems &nbsp;
                                <Link href="https://www.mtr.com.hk/en/corporate/consultancy/railwayoperation.html">
                                    overseas
                                </Link>
                                , including several in mainland China, such as Beijing Metro Line 4,
                                Shenzhen Metro Line 4, Hangzhou Metro Line 1 & 5. The MTR has also
                                aided in the development and operation of other systems through
                                partially owned subsidiaries such as Metro Trains Melbourne
                                (Melbourne Metropolitan Rail), Metro Trains Sydney (Sydney Metro),
                                and MTR Tunnelbanan AB (Stockholm Metro).
                            </p>
                            <p className="mt-4">
                                A primary incentive for the MTR to participate in these projects is
                                to limit brain drain from its own workforce. Hong Kong does not have
                                the capacity to continuously pump out new railway projects, and
                                thus, many employees would be left without work, leading them to
                                seek employment elsewhere. These workers, with the valuable
                                experience from past MTR projects, are critical for the MTR to
                                retain for the success of future projects, and thus the MTR does so
                                through these projects outside of Hong Kong.
                            </p>
                        </section>
                        <section aria-labelledby="conclusion-heading">
                            <h2 className="text-2xl font-bold" id="conclusion-heading">
                                Conclusion
                            </h2>
                            <p className="mt-4">
                                The MTR system of Hong Kong has always been a popular choice as a
                                case study for urban planners and transit enthusiasts alike. It is a
                                prime example of how a metro system can be successful and profitable
                                through innovative business models and policies. The MTR has grown
                                with the city and citizens of Hong Kong, and earned its spot as the
                                backbone of the city's transportation network.
                            </p>
                        </section>
                    </div>
                </article>
            </main>
            <footer className="flex justify-center items-center p-6 font-mono text-gray-500">
                Made by&nbsp;
                <a
                    href="https://github.com/Tom-the-Bomb"
                    className="effect-underline text-gray-800"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Tom-the-Bomb
                </a>
                &nbsp;2025
            </footer>
        </div>
    );
}
